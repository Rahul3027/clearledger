const { migrate } = require('drizzle-orm/postgres-js/migrator');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Dotenv parser
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  env.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[1].includes('DATABASE_URL') ? line.substring(line.indexOf('=') + 1).trim() : match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  });
}

async function main() {
  const dbUrl = process.env.DATABASE_URL_DIRECT;
  if (!dbUrl) {
    console.error("Missing DATABASE_URL_DIRECT in environment.");
    process.exit(1);
  }
  
  console.log("Connecting to direct database endpoint for migrations...");
  const sql = postgres(dbUrl, { max: 1 });
  const db = drizzle(sql);
  
  console.log("Applying migrations from src/infrastructure/db/migrations...");
  await migrate(db, { migrationsFolder: path.join(__dirname, '../src/infrastructure/db/migrations') });
  
  console.log("Migrations applied successfully!");
  await sql.end();
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
