# YourMedStore

A full-stack **chemical inventory, quotation, and order workflow** application built for the AasaMedChem assignment, using a React SPA frontend and an Express REST API backend instead of Next.js. This implementation focuses on precise unit conversion, role-based workflows, transaction-safe stock handling, and a deployment path that fits modern JavaScript hosting.

## Overview

YourMedStore supports two roles:

- **Admin** manages inventory and order decisions.
- **User** browses available chemicals, prepares quotations, and places orders using supported units.

The system stores chemical stock in normalized base units and recalculates all order values on the backend before committing any transaction. This keeps inventory, pricing, and unit conversion logic authoritative on the server.

## Highlights

- Role-based authentication for **Admin** and **User** accounts.
- Product catalog with search and stock-aware marketplace filtering.
- Support for mass, volume, and count-based ordering.
- Live quotation preview in INR on the frontend.
- Server-side conversion validation before order creation.
- Transaction-safe stock reservation using SQL transactions.
- Admin dashboard for reviewing and updating order status.
- Precise PostgreSQL numeric storage for pricing and quantities.

## Tech Stack

### Frontend

- React.js
- Vite
- JavaScript
- Tailwind CSS
- React Router
- lucide-react

### Backend

- Node.js
- Express
- CommonJS
- pg
- bcryptjs
- jsonwebtoken
- cors
- dotenv

### Database and Hosting

- Neon PostgreSQL
- Vercel-ready frontend deployment
- Node-compatible backend deployment target

## Architecture

The frontend is a single-page React application that communicates with the backend over HTTP. The backend exposes REST endpoints for authentication, products, and orders, and uses PostgreSQL as the source of truth for stock, pricing, order state, and unit conversions.

JWT-based authentication protects private routes on both the client and server:

- The frontend stores the token through `AuthContext` and attaches it to API requests.
- Admin-only pages are protected through route guards and backend role middleware.
- Critical order calculations are revalidated on the backend, even when the frontend shows an instant preview.

## Core Features

### Authentication and Authorization

- Register and login flow with JWT.
- Role support for `Admin` and `User`.
- Protected admin routes on both frontend and backend.
- Auth verification endpoints for session-aware UI behavior.

### Inventory Management

Admins can:

- Create products.
- Edit products.
- Delete products.
- Search products.
- Review available stock stored in base units.

### Marketplace and Quotation

Users can:

- Browse the product catalog.
- Search products live.
- Filter in-stock items.
- Choose quantities in supported units.
- See an instant quotation preview in INR.

### Order Processing

- Backend recalculates unit conversions before saving orders.
- Product rows are locked with `FOR UPDATE` during checkout.
- Stock is reserved when an order is placed.
- Rejection returns stock to inventory.
- Re-approval attempts to reserve stock again only if enough stock exists.

## Project Structure

```text
YourMedStore/
  backend/
    db/
      migrations/
        001_init_schema.sql
      seeds/
        001_sample_chemicals.sql
    scripts/
      run-sql.js
    src/
      config/
        db.js
      middleware/
        auth.middleware.js
      routes/
      utils/
        conversionEngine.js
  frontend/
    src/
      components/
      context/
        AuthContext.jsx
      pages/
      lib/
        api.js
```

## Database Schema

The schema is defined in `backend/db/migrations/001_init_schema.sql`.

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key using `gen_random_uuid()` |
| `email` | TEXT | Unique login email |
| `password_hash` | TEXT | bcrypt password hash |
| `role` | `user_role` | `Admin` or `User` |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Updated timestamp |

### `products`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | TEXT | Product name |
| `sku` | TEXT | Unique SKU |
| `description` | TEXT | Optional description |
| `base_unit` | `base_unit` | `g`, `L`, or `items` |
| `base_price_per_unit` | NUMERIC(20, 8) | INR price per base unit |
| `current_stock` | NUMERIC(20, 8) | Available stock in base units |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Updated timestamp |

### `orders`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | References `users(id)` |
| `status` | `order_status` | `Pending`, `Approved`, or `Rejected` |
| `total_amount` | NUMERIC(20, 8) | Final quotation total in INR |
| `notes` | TEXT | Optional notes |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Updated timestamp |

### `order_items`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `order_id` | UUID | References `orders(id)` |
| `product_id` | UUID | References `products(id)` |
| `requested_unit` | TEXT | `g`, `kg`, `L`, `mL`, or `items` |
| `requested_quantity` | NUMERIC(20, 8) | User-entered quantity |
| `base_unit` | `base_unit` | Stored unit dimension at order time |
| `converted_quantity` | NUMERIC(20, 8) | Quantity converted to base unit |
| `unit_price_at_order` | NUMERIC(20, 8) | INR price per base unit at order time |
| `line_total` | NUMERIC(20, 8) | Line total in INR |
| `created_at` | TIMESTAMPTZ | Created timestamp |

## Precision Strategy

YourMedStore uses `NUMERIC(20, 8)` for prices, stock, converted quantities, and totals.

This design helps the system:

- Avoid JavaScript floating-point precision issues at the database layer.
- Support very small chemical quantities.
- Preserve accurate monetary values for quotations.
- Safely store transaction-critical values with fixed precision.

## Units and Conversion Rules

Products are stored in normalized internal base units.

| Dimension | Internal base unit | Allowed user-facing units |
|---|---|---|
| Mass | `g` | `g`, `kg` |
| Volume | `L` | `L`, `mL` |
| Count | `items` | `items` |

### Conversion Factors

| Conversion | Factor |
|---|---|
| `1 kg` to `g` | `1000 g` |
| `1 g` to `g` | `1 g` |
| `1 L` to `L` | `1 L` |
| `1 mL` to `L` | `0.001 L` |
| `1 item` to `items` | `1 item` |

Conversion logic lives in:

```text
backend/src/utils/conversionEngine.js
```

### Validation Rules

- Frontend preview is only for responsiveness.
- Backend recalculates every order before writing to the database.
- Incompatible unit requests are rejected.
- Example: a product stored in `g` cannot be ordered in `mL`.

## Order Lifecycle

### Checkout Flow

1. User searches products in `/marketplace`.
2. User selects quantity and unit.
3. Frontend shows a live quotation preview.
4. User submits the quotation.
5. Backend opens a SQL transaction.
6. Product rows are locked with `FOR UPDATE`.
7. Requested units are converted to base units.
8. Stock availability is verified.
9. `orders` and `order_items` are inserted.
10. Reserved stock is subtracted.
11. Transaction is committed or rolled back.

### Status Behavior

| Status | Meaning |
|---|---|
| `Pending` | Stock is reserved. |
| `Approved` | Reservation is retained. |
| `Rejected` | Reserved stock is released back to inventory. |

Additional behavior:

- Moving an order from `Rejected` to `Approved` attempts stock deduction again.
- Approval only succeeds when enough stock is still available.

## API Reference

### Auth

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `GET` | `/api/auth/me` | Get current authenticated user |
| `GET` | `/api/auth/admin-check` | Verify admin access |

### Products

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/products` | Public/user marketplace products |
| `GET` | `/api/admin/products` | Admin inventory listing |
| `POST` | `/api/admin/products` | Create a product |
| `PUT` | `/api/admin/products/:id` | Update a product |
| `DELETE` | `/api/admin/products/:id` | Delete a product |

### Orders

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/orders` | Create a new order |
| `GET` | `/api/admin/orders` | Fetch all orders for admin review |
| `PATCH` | `/api/admin/orders/:id/status` | Approve or reject an order |

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd YourMedStore
```

### 2. Backend setup

```bash
cd backend
npm install
copy .env.example .env
```

Set the backend environment variables:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=your_neon_connection_string
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
```

Run migrations and seed data:

```bash
npm run db:migrate
npm run db:seed
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
copy .env.example .env
```

Set the frontend environment variable:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open the app in your browser:

```text
http://127.0.0.1:5173
```

## Demo Credentials

> Use these seeded accounts only for local development and demo testing.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@yourmedstore.local` | `admin123` |
| User | `user@yourmedstore.local` | `user123` |

## Environment Variables

### Backend

| Variable | Description |
|---|---|
| `PORT` | Backend server port |
| `NODE_ENV` | App environment |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `CORS_ORIGIN` | Allowed frontend origins |
| `JWT_SECRET` | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | JWT expiry duration |

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL for backend API requests |

## Deployment

### Recommended Production Split

- Deploy `frontend/` as a Vite application on Vercel.
- Deploy `backend/` to a Node-compatible host.
- Keep Neon PostgreSQL as the production database.

### Frontend Vercel Settings

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Environment Variable:
  VITE_API_BASE_URL=https://your-api-domain.example.com
```

### Backend Production Variables

```env
DATABASE_URL=your_neon_production_connection_string
JWT_SECRET=long_random_production_secret
JWT_EXPIRES_IN=1d
CORS_ORIGIN=https://your-frontend-domain.vercel.app
NODE_ENV=production
```

### Production Checklist

- Rotate any exposed or local credentials.
- Use a strong production `JWT_SECRET`.
- Run migrations on the production Neon branch.
- Seed only safe demo data.
- Restrict CORS to deployed frontend domains only.
- Verify environment variables on both services.

## Verification Checklist

The following project checks were completed:

- Backend migrations executed successfully against Neon.
- Seed data loaded successfully.
- API health check returned `200 OK`.
- Demo user login worked correctly.
- Marketplace product fetch succeeded.
- User order submission worked with conversion and stock subtraction.
- Admin order listing succeeded.
- Admin approval status update succeeded.
- Frontend production build completed successfully.

## Security Notes

Before using this project outside demo or assignment scope:

- Replace seeded credentials.
- Rotate database credentials if they were ever shared.
- Store strong secrets in environment variables only.
- Review `localStorage` token handling if production threat modeling requires stricter client-side auth storage.
- Add rate limiting, request validation, and audit logging for real-world use.

## Suggested Improvements

If you want to extend the project further, strong next steps would be:

- Add pagination and sorting for inventory and orders.
- Add product image uploads.
- Add audit logs for stock and status changes.
- Add PDF quotation export.
- Add order history for users.
- Add refresh token support and better session management.
- Add automated tests for conversion logic and transaction flows.
- Add Docker support for one-command local setup.

## Why This README Is Stronger

This version is designed to be easier for reviewers, recruiters, and maintainers to scan quickly:

- Clearer structure and headings.
- Better separation of architecture, schema, setup, and deployment.
- Cleaner API tables.
- More explicit security and production notes.
- Stronger explanation of the conversion and reservation model.

## License

Add a license here if you plan to publish or reuse the project publicly.
