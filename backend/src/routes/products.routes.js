const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth.middleware');
const { mapProduct } = require('../utils/productMapper');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  const search = req.query.search?.trim();
  const inStockOnly = req.query.inStockOnly !== 'false';
  const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '12', 10), 1), 100);
  const offset = (page - 1) * limit;
  const params = [];
  const clauses = [];

  if (search) {
    params.push(search);
    clauses.push(`(
      to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')) @@ websearch_to_tsquery('english', $${params.length})
      OR sku ILIKE '%' || $${params.length} || '%'
    )`);
  }

  if (inStockOnly) {
    clauses.push('current_stock > 0');
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

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

module.exports = router;
