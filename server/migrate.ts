import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { db } from './db/connection.js';

// Ensure the target database exists
const connStr = process.env.DATABASE_URL!;
const url = new URL(connStr);
const dbName = url.pathname.slice(1); // remove leading "/"
url.pathname = '/postgres';           // connect to default db

const adminSql = postgres(url.toString());
const existing = await adminSql`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
if (existing.length === 0) {
  console.log(`Creating database "${dbName}"...`);
  await adminSql.unsafe(`CREATE DATABASE "${dbName}"`);
}
await adminSql.end();

console.log('Running migrations...');
await migrate(db, { migrationsFolder: './drizzle' });
console.log('Migrations complete.');
process.exit(0);
