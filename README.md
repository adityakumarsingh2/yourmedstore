# YourMedStore Chemical Inventory and Quotation System

YourMedStore is a full-stack chemical inventory and order management system built for the AasaMedChem assignment. The original assignment mentioned Next.js, but this implementation intentionally uses a React.js SPA with Vite and Tailwind CSS on the frontend, plus a Node.js/Express REST API on the backend. Neon PostgreSQL is the primary database.

## Features

- Role-based authentication for Admin and User accounts.
- Admin inventory management with create, read, update, delete, and search.
- User marketplace with live product search and in-stock filtering.
- Flexible order units for grams, kilograms, liters, milliliters, and items.
- INR quotation totals with instant client-side recalculation.
- Server-side conversion validation before checkout.
- Transaction-safe order placement with stock reservation.
- Admin order dashboard with conversion details and approve/reject status actions.

## Tech Stack

- Frontend: React.js, Vite, JavaScript, Tailwind CSS, React Router, lucide-react
- Backend: Node.js, Express, CommonJS, cors, dotenv, pg, bcryptjs, jsonwebtoken
- Database: Neon-hosted PostgreSQL
- Deployment target: Vercel for frontend and API-compatible Node hosting for backend

## Project Structure

```text
YourMedStore/
  backend/
    db/
      migrations/001_init_schema.sql
      seeds/001_sample_chemicals.sql
    scripts/run-sql.js
    src/
      config/db.js
      middleware/auth.middleware.js
      routes/
      utils/conversionEngine.js
  frontend/
    src/
      components/
      context/AuthContext.jsx
      pages/
      lib/api.js
```

## System Design

The React SPA calls the Express REST API over HTTP. The API validates authentication with JWTs, performs product and order operations, and talks to Neon PostgreSQL through `pg`. PostgreSQL stores users, products, orders, and order items with high-precision numeric fields.

The frontend stores the JWT in `localStorage` through `AuthContext`. Admin-only screens are protected by `ProtectedRoute` and backend role middleware. The backend remains the source of truth for stock, unit conversion, pricing, and checkout transactions.

## Database Schema

The schema is defined in `backend/db/migrations/001_init_schema.sql`.

### users

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key, `gen_random_uuid()` |
| email | TEXT | Unique login email |
| password_hash | TEXT | bcrypt hash |
| role | user_role enum | `Admin` or `User` |
| created_at | TIMESTAMPTZ | Audit timestamp |
| updated_at | TIMESTAMPTZ | Audit timestamp |

### products

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| name | TEXT | Product name |
| sku | TEXT | Unique SKU |
| description | TEXT | Optional description |
| base_unit | base_unit enum | `g`, `L`, or `items` |
| base_price_per_unit | NUMERIC(20, 8) | INR price per base unit |
| current_stock | NUMERIC(20, 8) | Stock in base units |
| created_at | TIMESTAMPTZ | Audit timestamp |
| updated_at | TIMESTAMPTZ | Audit timestamp |

### orders

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| user_id | UUID | References `users(id)` |
| status | order_status enum | `Pending`, `Approved`, `Rejected` |
| total_amount | NUMERIC(20, 8) | INR quotation total |
| notes | TEXT | Optional notes |
| created_at | TIMESTAMPTZ | Audit timestamp |
| updated_at | TIMESTAMPTZ | Audit timestamp |

### order_items

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| order_id | UUID | References `orders(id)` |
| product_id | UUID | References `products(id)` |
| requested_unit | TEXT | `g`, `kg`, `L`, `mL`, or `items` |
| requested_quantity | NUMERIC(20, 8) | User-entered quantity |
| base_unit | base_unit enum | Base storage unit at order time |
| converted_quantity | NUMERIC(20, 8) | Quantity converted into base unit |
| unit_price_at_order | NUMERIC(20, 8) | INR price per base unit at order time |
| line_total | NUMERIC(20, 8) | INR line total |
| created_at | TIMESTAMPTZ | Audit timestamp |

## Numeric Precision

Prices, quantities, converted quantities, and totals use `NUMERIC(20, 8)`. This avoids JavaScript floating-point storage errors in PostgreSQL and supports high-precision chemical quantities, large stock values, and INR pricing. The API formats numeric strings to eight decimal places before storing transaction-critical values.

## Unit Storage and Conversion Strategy

Products are stored internally in base units:

| Dimension | Internal base unit | User-facing units |
| --- | --- | --- |
| Mass | `g` | `g`, `kg` |
| Volume | `L` | `L`, `mL` |
| Count | `items` | `items` |

Conversion factors:

| Conversion | Factor |
| --- | --- |
| `1 kg` to `g` | `1000 g` |
| `1 g` to `g` | `1 g` |
| `1 L` to `L` | `1 L` |
| `1 mL` to `L` | `0.001 L` |
| `1 item` to `items` | `1 item` |

Conversions are implemented in `backend/src/utils/conversionEngine.js`.

The frontend also performs instant preview calculations for responsiveness, but checkout recalculates everything on the backend before writing orders or subtracting stock. The backend rejects incompatible units, such as ordering `mL` for a product stored in `g`.

## Order Flow

1. User searches products in `/marketplace`.
2. User selects quantity and unit.
3. Frontend calculates a live INR preview.
4. User places a quotation.
5. Backend starts a SQL transaction.
6. Backend locks product rows with `FOR UPDATE`.
7. Backend converts requested units to base units.
8. Backend verifies stock and inserts `orders` and `order_items`.
9. Backend subtracts reserved stock.
10. Backend commits or rolls back the transaction.

Admin status handling:

- `Pending` means stock is reserved.
- `Approved` keeps the reservation.
- `Rejected` releases the reserved stock back to inventory.
- Changing a rejected order back to approved subtracts stock again if enough stock is available.

## Local Setup

Install backend dependencies:

```bash
cd backend
npm install
copy .env.example .env
```

Set backend environment variables:

```bash
PORT=5000
NODE_ENV=development
DATABASE_URL=your_neon_connection_string
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
```

Run database setup:

```bash
npm run db:migrate
npm run db:seed
```

Start backend:

```bash
npm run dev
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
copy .env.example .env
```

Set frontend environment variables:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

Start frontend:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Test Credentials

Seeded accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@yourmedstore.local` | `admin123` |
| User | `user@yourmedstore.local` | `user123` |

## API Overview

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/admin-check`

Products:

- `GET /api/products`
- `GET /api/admin/products`
- `POST /api/admin/products`
- `PUT /api/admin/products/:id`
- `DELETE /api/admin/products/:id`

Orders:

- `POST /api/orders`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status`

## Vercel Deployment Notes

Recommended production split:

- Deploy `frontend/` as a Vercel React/Vite project.
- Deploy `backend/` to a Node-capable API host, or adapt Express routes to Vercel serverless functions if using a single Vercel project.
- Use Neon PostgreSQL for production database.

Frontend Vercel settings:

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Environment Variable:
  VITE_API_BASE_URL=https://your-api-domain.example.com
```

Backend environment variables:

```text
DATABASE_URL=your_neon_production_connection_string
JWT_SECRET=long_random_production_secret
JWT_EXPIRES_IN=1d
CORS_ORIGIN=https://your-frontend-domain.vercel.app
NODE_ENV=production
```

Before production use:

- Rotate any local or exposed database credentials.
- Use a strong `JWT_SECRET`.
- Run migrations against the production Neon branch.
- Seed only safe demo data, not real credentials.
- Confirm CORS points only to deployed frontend domains.

## Verification Performed

- Backend migrations ran successfully against Neon.
- Seed data loaded successfully.
- API health check returned `200 OK`.
- Demo user login succeeded.
- Marketplace product fetch succeeded.
- User order submission succeeded with unit conversion and transaction stock subtraction.
- Admin order listing succeeded.
- Admin approval status update succeeded.
- Frontend production build completed successfully.
