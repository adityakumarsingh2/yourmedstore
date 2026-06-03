const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { supportedBaseUnits } = require('../utils/conversionEngine');

const router = express.Router();

router.use(authenticateToken, requireRole('Admin'));

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    baseUnit: row.base_unit,
    basePricePerUnit: row.base_price_per_unit,
    currentStock: row.current_stock,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

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
  const params = [];
  let whereClause = '';

  if (search) {
    params.push(`%${search}%`);
    whereClause = 'WHERE name ILIKE $1 OR sku ILIKE $1 OR description ILIKE $1';
  }

  const result = await pool.query(
    `SELECT id, name, sku, description, base_unit, base_price_per_unit, current_stock, created_at, updated_at
     FROM products
     ${whereClause}
     ORDER BY name ASC`,
    params
  );

  res.json({ products: result.rows.map(mapProduct) });
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

router.put('/:id', async (req, res) => {
  try {
    const product = normalizeProductPayload(req.body);
    const result = await pool.query(
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

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    return res.json({ product: mapProduct(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'A product with this SKU already exists.' });
    }

    return res.status(400).json({ message: error.message });
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
