const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
const allowedStatuses = new Set(['Approved', 'Rejected']);

router.use(authenticateToken, requireRole('Admin'));

function mapOrderRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    status: row.status,
    totalAmount: row.total_amount,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: row.items || []
  };
}

router.get('/', async (req, res) => {
  const result = await pool.query(
    `SELECT
       o.id,
       o.user_id,
       u.email AS user_email,
       o.status,
       o.total_amount,
       o.notes,
       o.created_at,
       o.updated_at,
       COALESCE(
         json_agg(
           json_build_object(
             'id', oi.id,
             'productId', oi.product_id,
             'productName', p.name,
             'sku', p.sku,
             'requestedUnit', oi.requested_unit,
             'requestedQuantity', oi.requested_quantity,
             'baseUnit', oi.base_unit,
             'convertedQuantity', oi.converted_quantity,
             'unitPriceAtOrder', oi.unit_price_at_order,
             'lineTotal', oi.line_total
           )
           ORDER BY oi.created_at ASC
         ) FILTER (WHERE oi.id IS NOT NULL),
         '[]'::json
       ) AS items
     FROM orders o
     JOIN users u ON u.id = o.user_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     GROUP BY o.id, u.email
     ORDER BY o.created_at DESC`
  );

  res.json({ orders: result.rows.map(mapOrderRow) });
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;

  if (!allowedStatuses.has(status)) {
    return res.status(400).json({ message: 'Status must be Approved or Rejected.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `SELECT id, status
       FROM orders
       WHERE id = $1
       FOR UPDATE`,
      [req.params.id]
    );

    const order = orderResult.rows[0];

    if (!order) {
      throw new Error('Order not found.');
    }

    if (order.status === status) {
      await client.query('COMMIT');
      return res.json({ order: { id: order.id, status: order.status } });
    }

    const itemsResult = await client.query(
      `SELECT product_id, converted_quantity
       FROM order_items
       WHERE order_id = $1`,
      [order.id]
    );

    if (status === 'Rejected' && order.status !== 'Rejected') {
      for (const item of itemsResult.rows) {
        await client.query(
          `UPDATE products
           SET current_stock = current_stock + $1
           WHERE id = $2`,
          [item.converted_quantity, item.product_id]
        );
      }
    }

    if (order.status === 'Rejected' && status === 'Approved') {
      for (const item of itemsResult.rows) {
        const stockResult = await client.query(
          `SELECT name, current_stock
           FROM products
           WHERE id = $1
           FOR UPDATE`,
          [item.product_id]
        );

        const product = stockResult.rows[0];

        if (!product || Number(product.current_stock) < Number(item.converted_quantity)) {
          throw new Error(`Insufficient stock to approve ${product?.name || 'this product'}.`);
        }

        await client.query(
          `UPDATE products
           SET current_stock = current_stock - $1
           WHERE id = $2`,
          [item.converted_quantity, item.product_id]
        );
      }
    }

    const updatedOrderResult = await client.query(
      `UPDATE orders
       SET status = $1
       WHERE id = $2
       RETURNING id, status`,
      [status, order.id]
    );

    await client.query('COMMIT');

    return res.json({ order: updatedOrderResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
