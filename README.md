# YourMedStore

> **Full-Stack Chemical Inventory & Quotation Management System**

![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/API-Express-black)
![PostgreSQL](https://img.shields.io/badge/Database-Neon_PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![License](https://img.shields.io/badge/License-MIT-green)

A modern chemical inventory and quotation management platform built for the **AasaMedChem Full-Stack Assignment**. The application provides secure role-based authentication, inventory management, precision unit conversion, and transaction-safe quotation processing.

---

# Table of Contents

- Features
- Tech Stack
- Project Structure
- System Architecture
- Database Schema
- Unit Conversion Strategy
- Order Workflow
- Local Setup
- Environment Variables
- Test Credentials
- API Overview
- Deployment
- Security Features
- Future Improvements
- Verification

---

# Features

## User

- Secure authentication using JWT
- Browse marketplace
- Live product search
- In-stock filtering
- Flexible unit selection (g, kg, L, mL, items)
- Live quotation calculation
- Transaction-safe order placement

## Admin

- Dashboard
- Product CRUD
- Inventory search
- Order management
- Approve / Reject quotations
- Automatic stock restoration on rejection

---

# Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | React.js, Vite, Tailwind CSS, React Router, JavaScript |
| Backend | Node.js, Express, CommonJS |
| Database | Neon PostgreSQL |
| Authentication | JWT, bcryptjs |
| Database Driver | pg |
| Icons | lucide-react |

---

# Project Structure

```text
YourMedStore/
├── backend/
│   ├── db/
│   │   ├── migrations/
│   │   └── seeds/
│   ├── scripts/
│   └── src/
│       ├── config/
│       ├── middleware/
│       ├── routes/
│       └── utils/
└── frontend/
    └── src/
        ├── components/
        ├── context/
        ├── pages/
        └── lib/
```

---

# System Architecture

```text
React + Vite SPA
        │
 REST API (JWT)
        │
Node.js + Express
        │
 PostgreSQL (Neon)
```

The frontend communicates with the Express REST API. Authentication is handled using JWT tokens, while PostgreSQL stores users, products, orders, and order items. The backend remains the single source of truth for pricing, stock validation, unit conversion, and checkout transactions.

---

# Database Schema

## users

Stores authentication credentials and user roles.

## products

Stores inventory, pricing, SKU, stock, and base units.

## orders

Stores quotation information and approval status.

## order_items

Stores product quantities, converted values, pricing snapshots, and totals.

All monetary values and quantities use `NUMERIC(20,8)` for precision.

---

# Unit Conversion Strategy

Products are stored internally using base units.

| Category | Base Unit | Supported Units |
|----------|-----------|-----------------|
| Mass | g | g, kg |
| Volume | L | L, mL |
| Count | items | items |

Supported conversions:

| Conversion | Result |
|------------|--------|
| 1 kg | 1000 g |
| 1 g | 1 g |
| 1 L | 1 L |
| 1 mL | 0.001 L |
| 1 item | 1 item |

The frontend performs instant previews while the backend validates all conversions before committing transactions.

---

# Order Workflow

```text
User
 │
 ▼
Browse Marketplace
 │
 ▼
Choose Quantity & Unit
 │
 ▼
Live Quote Preview
 │
 ▼
Submit Order
 │
 ▼
SQL Transaction Begins
 │
 ▼
FOR UPDATE Row Lock
 │
 ▼
Unit Conversion
 │
 ▼
Stock Validation
 │
 ▼
Insert Order
 │
 ▼
Reserve Stock
 │
 ▼
Commit / Rollback
```

---

# Local Setup

## Backend

```bash
cd backend
npm install
cp .env.example .env

npm run db:migrate
npm run db:seed
npm run dev
```

## Frontend

```bash
cd frontend
npm install
cp .env.example .env

npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

---

# Environment Variables

## Backend

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=your_neon_connection_string
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:5173
```

## Frontend

```env
VITE_API_BASE_URL=http://localhost:5000
```

---

# Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@yourmedstore.local | admin123 |
| User | user@yourmedstore.local | user123 |

---

# API Overview

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
GET  /api/auth/admin-check
```

## Products

```http
GET    /api/products
GET    /api/admin/products
POST   /api/admin/products
PUT    /api/admin/products/:id
DELETE /api/admin/products/:id
```

## Orders

```http
POST  /api/orders
GET   /api/admin/orders
PATCH /api/admin/orders/:id/status
```

---

# Deployment

### Frontend

- Vercel

### Backend

- Render
- Railway
- VPS
- Any Node-compatible host

### Database

- Neon PostgreSQL

Before deployment:

- Configure production environment variables.
- Rotate secrets.
- Run migrations.
- Seed only demo data.
- Restrict CORS to production domains.

---

# Security Features

- JWT Authentication
- Password hashing using bcrypt
- Role-based authorization
- Protected admin routes
- SQL transactions
- Row locking using `FOR UPDATE`
- Server-side unit validation
- Stock reservation & rollback
- Precision-safe numeric calculations

---

# Future Improvements

- Email notifications
- PDF quotation export
- Product categories
- Bulk CSV import
- Analytics dashboard
- Docker support
- CI/CD with GitHub Actions
- Refresh token authentication
- Pagination & sorting

---

# Verification

- ✅ Database migrations completed
- ✅ Seed data loaded
- ✅ Authentication tested
- ✅ Product CRUD verified
- ✅ Marketplace working
- ✅ Order placement verified
- ✅ Unit conversion validated
- ✅ Inventory reservation tested
- ✅ Admin approval workflow verified
- ✅ Production build successful

---

# License

This project was developed for the **AasaMedChem Full-Stack Assignment** and is intended for educational and portfolio purposes.
