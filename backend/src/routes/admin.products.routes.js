const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { supportedBaseUnits } = require('../utils/conversionEngine');
const { mapProduct } = require('../utils/productMapper');

const router = express.Router();

router.use(authenticateToken, requireRole('Admin'));

function normalizeProductPayload(body) {
  const name = body.name?.trim();
  const sku = body.sku?.trim();
  const description = body.description?.trim() || null;
  const baseUnit = body.baseUnit;
  const basePricePerUnit = body.basePricePerUnit;
  const currentStock = body.currentStock;

  if (!name) {
    throw new Error('Product name is required.');
  }

  if (!sku) {
    throw new Error('SKU is required.');
  }

  if (!supportedBaseUnits.has(baseUnit)) {
    throw new Error('Base unit must be g, L, or items.');
  }

  if (!Number.isFinite(Number(basePricePerUnit)) || Number(basePricePerUnit) < 0) {
    throw new Error('Base price per unit must be a non-negative number.');
  }

  if (!Number.isFinite(Number(currentStock)) || Number(currentStock) < 0) {
    throw new Error('Current stock must be a non-negative number.');
  }

  return {
    name,
    sku,
    description,
    baseUnit,
    basePricePerUnit: Number(basePricePerUnit).toFixed(8),
    currentStock: Number(currentStock).toFixed(8)
  };
}

router.get('/', async (req, res) => {
  const search = req.query.search?.trim();
  const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '20', 10), 1), 100);
  const offset = (page - 1) * limit;
  const params = [];
  let whereClause = '';

  if (search) {
    params.push(search);
    whereClause = `WHERE (
      to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')) @@ websearch_to_tsquery('english', $1)
      OR sku ILIKE '%' || $1 || '%'
    )`;
  }

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT id, name, sku, description, base_unit, base_price_per_unit, current_stock, created_at, updated_at
     FROM products
     ${whereClause}
     ORDER BY name ASC
     LIMIT $${params.length - 1}
     OFFSET $${params.length}`,
    params
  );

  res.json({ products: result.rows.map(mapProduct), page, limit });
});

router.post('/', async (req, res) => {
  try {
    const product = normalizeProductPayload(req.body);
    const result = await pool.query(
      `INSERT INTO products (name, sku, description, base_unit, base_price_per_unit, current_stock)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, sku, description, base_unit, base_price_per_unit, current_stock, created_at, updated_at`,
      [
        product.name,
        product.sku,
        product.description,
        product.baseUnit,
        product.basePricePerUnit,
        product.currentStock
      ]
    );

    res.status(201).json({ product: mapProduct(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'A product with this SKU already exists.' });
    }

    return res.status(400).json({ message: error.message });
  }
});

router.post('/:id/adjust-stock', async (req, res) => {
  const quantityDelta = Number(req.body.quantityDelta);
  const reason = req.body.reason?.trim();

  if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
    return res.status(400).json({ message: 'Quantity delta must be a non-zero number.' });
  }

  if (!reason) {
    return res.status(400).json({ message: 'Adjustment reason is required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const productResult = await client.query(
      `SELECT id, current_stock
       FROM products
       WHERE id = $1
       FOR UPDATE`,
      [req.params.id]
    );

    const product = productResult.rows[0];

    if (!product) {
      throw new Error('Product not found.');
    }

    const newStock = Number(product.current_stock) + quantityDelta;

    if (newStock < 0) {
      throw new Error('Adjustment would make stock negative.');
    }

    const updatedResult = await client.query(
      `UPDATE products
       SET current_stock = $1
       WHERE id = $2
       RETURNING id, name, sku, description, base_unit, base_price_per_unit, current_stock, created_at, updated_at`,
      [newStock.toFixed(8), product.id]
    );

    await client.query(
      `INSERT INTO stock_adjustment_history (
         product_id, adjusted_by, adjustment_type, quantity_delta, previous_stock, new_stock, reason
       )
       VALUES ($1, $2, 'AdminAdjustment', $3, $4, $5, $6)`,
      [product.id, req.user.id, quantityDelta.toFixed(8), product.current_stock, newStock.toFixed(8), reason]
    );

    await client.query('COMMIT');
    return res.json({ product: mapProduct(updatedResult.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    const product = normalizeProductPayload(req.body);
    await client.query('BEGIN');
    const currentResult = await client.query(
      `SELECT current_stock
       FROM products
       WHERE id = $1
       FOR UPDATE`,
      [req.params.id]
    );

    if (!currentResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Product not found.' });
    }

    const previousStock = Number(currentResult.rows[0].current_stock);
    const nextStock = Number(product.currentStock);
    const result = await client.query(
      `UPDATE products
       SET name = $1,
           sku = $2,
           description = $3,
           base_unit = $4,
           base_price_per_unit = $5,
           current_stock = $6
       WHERE id = $7
       RETURNING id, name, sku, description, base_unit, base_price_per_unit, current_stock, created_at, updated_at`,
      [
        product.name,
        product.sku,
        product.description,
        product.baseUnit,
        product.basePricePerUnit,
        product.currentStock,
        req.params.id
      ]
    );

    if (previousStock !== nextStock) {
      await client.query(
        `INSERT INTO stock_adjustment_history (
           product_id, adjusted_by, adjustment_type, quantity_delta, previous_stock, new_stock, reason
         )
         VALUES ($1, $2, 'AdminAdjustment', $3, $4, $5, $6)`,
        [
          req.params.id,
          req.user.id,
          (nextStock - previousStock).toFixed(8),
          previousStock.toFixed(8),
          nextStock.toFixed(8),
          'Stock changed from product edit form.'
        ]
      );
    }

    await client.query('COMMIT');
    return res.json({ product: mapProduct(result.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ message: 'A product with this SKU already exists.' });
    }

    return res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM products
       WHERE id = $1
       RETURNING id`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    return res.status(204).send();
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({ message: 'This product is already referenced by orders and cannot be deleted.' });
    }

    return res.status(500).json({ message: 'Unable to delete product.' });
  }
});

module.exports = router;
