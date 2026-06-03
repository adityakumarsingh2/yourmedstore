const express = require('express');
const pool = require('../config/db');
const { mapProduct } = require('../utils/productMapper');

const router = express.Router();

router.get('/', async (req, res) => {
  const search = req.query.search?.trim();
  const inStockOnly = req.query.inStockOnly !== 'false';
  const params = [];
  const clauses = [];

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }

  if (inStockOnly) {
    clauses.push('current_stock > 0');
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT id, name, sku, description, base_unit, base_price_per_unit, current_stock, created_at, updated_at
     FROM products
     ${whereClause}
     ORDER BY name ASC`,
    params
  );

  res.json({ products: result.rows.map(mapProduct) });
});

module.exports = router;
