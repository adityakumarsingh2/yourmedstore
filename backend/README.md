# YourMedStore Backend

Step 1 backend setup for the AasaMedChem chemical inventory and order management system.

## Stack

- Node.js with Express
- CommonJS modules
- PostgreSQL via `pg`
- Neon PostgreSQL connection through `DATABASE_URL`
- `NUMERIC(20, 8)` for prices, quantities, converted quantities, and totals

## Local Setup

```bash
cd backend
npm install
copy .env.example .env
```

Add your Neon connection string to `.env`:

```bash
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
```

Run the schema and seed scripts:

```bash
npm run db:migrate
npm run db:seed
```

Start the API:

```bash
npm run dev
```

Health check:

```bash
GET http://localhost:5000/api/health
```

## Schema Notes

- Product inventory is stored in base units only: `g`, `L`, or `items`.
- Order items preserve both requested units (`g`, `kg`, `L`, `mL`, `items`) and converted base quantities.
- Prices are INR-denominated values per product base unit.
- Authentication endpoints and real password hashing are intentionally deferred to Step 3.
