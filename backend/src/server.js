require('dotenv').config();

const cors = require('cors');
const express = require('express');
const adminOrderRoutes = require('./routes/admin.orders.routes');
const adminProductRoutes = require('./routes/admin.products.routes');
const authRoutes = require('./routes/auth.routes');
const healthRoutes = require('./routes/health.routes');
const orderRoutes = require('./routes/orders.routes');
const productRoutes = require('./routes/products.routes');

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'YourMedStore chemical inventory API',
    version: '1.0.0'
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    message: error.message || 'Internal server error'
  });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
