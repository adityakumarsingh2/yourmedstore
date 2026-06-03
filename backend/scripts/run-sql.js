require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function runSqlFile() {
  const relativeFilePath = process.argv[2];

  if (!relativeFilePath) {
    throw new Error('Usage: node scripts/run-sql.js <relative-sql-file-path>');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Add it to .env before running database scripts.');
  }

  const absoluteFilePath = path.resolve(__dirname, '..', relativeFilePath);
  const sql = fs.readFileSync(absoluteFilePath, 'utf8');

  await pool.query(sql);
  console.log(`Executed SQL file: ${relativeFilePath}`);
}

runSqlFile()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
