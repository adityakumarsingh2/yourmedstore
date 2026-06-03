const express = require('express');
const Decimal = require('decimal.js');
const pool = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
const allowedStatuses = new Set(['Approved', 'Rejected']);
const dashboardStatuses = new Set(['Pending', 'Approved', 'Rejected']);

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
  const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '20', 10), 1), 100);
  const offset = (page - 1) * limit;
  const status = req.query.status?.trim();
  const params = [];
  const clauses = [];

  if (status) {
    if (!dashboardStatuses.has(status)) {
      return res.status(400).json({ message: 'Invalid order status filter.' });
    }

    params.push(status);
    clauses.push(`o.status = $${params.length}`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(limit, offset);

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
     ${whereClause}
     GROUP BY o.id, u.email
     ORDER BY o.created_at DESC
     LIMIT $${params.length - 1}
     OFFSET $${params.length}`,
    params
  );

  res.json({ orders: result.rows.map(mapOrderRow), page, limit });
});

router.patch('/:id/status', async (req, res) => {
  const { status, rejectedReason = '' } = req.body;

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
        const stockResult = await client.query(
          `SELECT current_stock
           FROM products
           WHERE id = $1
           FOR UPDATE`,
          [item.product_id]
        );
        const previousStock = stockResult.rows[0].current_stock;
        const newStock = new Decimal(previousStock).plus(item.converted_quantity).toFixed(8);

        await client.query(
          `UPDATE products
           SET current_stock = $1
           WHERE id = $2`,
          [newStock, item.product_id]
        );
        await client.query(
          `INSERT INTO stock_adjustment_history (
             product_id, adjusted_by, adjustment_type, quantity_delta, previous_stock, new_stock, reason, reference_type, reference_id
           )
           VALUES ($1, $2, 'OrderRejectionRelease', $3, $4, $5, $6, 'Order', $7)`,
          [item.product_id, req.user.id, item.converted_quantity, previousStock, newStock, rejectedReason || 'Order rejected by admin.', order.id]
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

        if (!product || new Decimal(product.current_stock).lt(item.converted_quantity)) {
          throw new Error(`Insufficient stock to approve ${product?.name || 'this product'}.`);
        }

        const newStock = new Decimal(product.current_stock).minus(item.converted_quantity).toFixed(8);

        await client.query(
          `UPDATE products
           SET current_stock = $1
           WHERE id = $2`,
          [newStock, item.product_id]
        );
        await client.query(
          `INSERT INTO stock_adjustment_history (
             product_id, adjusted_by, adjustment_type, quantity_delta, previous_stock, new_stock, reason, reference_type, reference_id
           )
           VALUES ($1, $2, 'RejectedOrderApprovalReservation', $3, $4, $5, $6, 'Order', $7)`,
          [item.product_id, req.user.id, new Decimal(item.converted_quantity).negated().toFixed(8), product.current_stock, newStock, 'Rejected order re-approved by admin.', order.id]
        );
      }
    }

    const updatedOrderResult = await client.query(
      `UPDATE orders
       SET status = $1,
           approved_by = CASE WHEN $1 = 'Approved' THEN $3 ELSE approved_by END,
           approved_at = CASE WHEN $1 = 'Approved' THEN NOW() ELSE approved_at END,
           rejected_by = CASE WHEN $1 = 'Rejected' THEN $3 ELSE rejected_by END,
           rejected_at = CASE WHEN $1 = 'Rejected' THEN NOW() ELSE rejected_at END,
           rejected_reason = CASE WHEN $1 = 'Rejected' THEN $4 ELSE rejected_reason END
       WHERE id = $2
       RETURNING id, status`,
      [status, order.id, req.user.id, rejectedReason || null]
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
