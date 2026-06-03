const express = require('express');
const Decimal = require('decimal.js');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middleware');
const { calculateLineTotal } = require('../utils/conversionEngine');

const router = express.Router();

router.use(authenticateToken);

function mapOrderItem(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    requestedUnit: row.requested_unit,
    requestedQuantity: row.requested_quantity,
    baseUnit: row.base_unit,
    convertedQuantity: row.converted_quantity,
    unitPriceAtOrder: row.unit_price_at_order,
    lineTotal: row.line_total
  };
}

router.post('/', async (req, res) => {
  const { items, notes = null } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'At least one order item is required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, total_amount, notes)
       VALUES ($1, 'Pending', 0, $2)
       RETURNING id, status, total_amount, notes, created_at`,
      [req.user.id, notes]
    );

    const order = orderResult.rows[0];
    const createdItems = [];
    let totalAmount = new Decimal(0);

    for (const item of items) {
      const productResult = await client.query(
        `SELECT id, name, base_unit, base_price_per_unit, current_stock
         FROM products
         WHERE id = $1
         FOR UPDATE`,
        [item.productId]
      );

      const product = productResult.rows[0];

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const calculation = calculateLineTotal({
        quantity: item.quantity,
        requestedUnit: item.unit,
        baseUnit: product.base_unit,
        basePricePerUnit: product.base_price_per_unit
      });

      if (new Decimal(calculation.convertedQuantity).gt(product.current_stock)) {
        throw new Error(`Insufficient stock for ${product.name}.`);
      }

      const newStock = new Decimal(product.current_stock).minus(calculation.convertedQuantity).toFixed(8);

      await client.query(
        `UPDATE products
         SET current_stock = $1
         WHERE id = $2`,
        [newStock, product.id]
      );

      await client.query(
        `INSERT INTO stock_adjustment_history (
           product_id, adjusted_by, adjustment_type, quantity_delta, previous_stock, new_stock, reason, reference_type, reference_id
         )
         VALUES ($1, $2, 'OrderReservation', $3, $4, $5, $6, 'Order', $7)`,
        [
          product.id,
          req.user.id,
          new Decimal(calculation.convertedQuantity).negated().toFixed(8),
          product.current_stock,
          newStock,
          'Stock reserved during quotation checkout.',
          order.id
        ]
      );

      const orderItemResult = await client.query(
        `INSERT INTO order_items (
           order_id,
           product_id,
           requested_unit,
           requested_quantity,
           base_unit,
           converted_quantity,
           unit_price_at_order,
           line_total
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, product_id, requested_unit, requested_quantity, base_unit, converted_quantity, unit_price_at_order, line_total`,
        [
          order.id,
          product.id,
          calculation.requestedUnit,
          calculation.requestedQuantity,
          calculation.baseUnit,
          calculation.convertedQuantity,
          calculation.basePricePerUnit,
          calculation.lineTotal
        ]
      );

      totalAmount = totalAmount.plus(calculation.lineTotal);
      createdItems.push({
        ...orderItemResult.rows[0],
        product_name: product.name
      });
    }

    const updatedOrderResult = await client.query(
      `UPDATE orders
       SET total_amount = $1
       WHERE id = $2
       RETURNING id, status, total_amount, notes, created_at`,
      [totalAmount.toFixed(8), order.id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      order: {
        id: updatedOrderResult.rows[0].id,
        status: updatedOrderResult.rows[0].status,
        totalAmount: updatedOrderResult.rows[0].total_amount,
        notes: updatedOrderResult.rows[0].notes,
        createdAt: updatedOrderResult.rows[0].created_at,
        items: createdItems.map(mapOrderItem)
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
