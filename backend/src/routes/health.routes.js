const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS database_time');

    res.json({
      status: 'ok',
      service: 'your-med-store-api',
      databaseTime: result.rows[0].database_time
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      detail: error.message
    });
  }
});

module.exports = router;
