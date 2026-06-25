const { createClient } = require('@supabase/supabase-js');
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Simple dotenv parser
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
  const dbUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!dbUrl || !supabaseUrl || !serviceKey) {
    console.error("Error: Missing required environment variables in .env");
    process.exit(1);
  }

  const sql = postgres(dbUrl, { prepare: false });

  try {
    // 1. Resolve Organisation ID
    let orgId = "00000000-0000-0000-0000-000000000001";
    const orgs = await sql`SELECT id FROM organisations LIMIT 1`;
    if (orgs.length > 0) {
      orgId = orgs[0].id;
    }

    // 2. Initialize Supabase Admin
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const email = "test@clearledger.com";
    const password = "Password123!";

    // 3. Find user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    let testUser = users.find(u => u.email === email);

    if (!testUser) {
      console.log(`Creating user ${email} with password...`);
      const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { org_id: orgId }
      });
      if (createError) throw createError;
      testUser = user;
      console.log(`Created user successfully.`);
    } else {
      console.log(`Updating password for user ${email}...`);
      const { data: { user }, error: updateError } = await supabase.auth.admin.updateUserById(testUser.id, {
        password,
        user_metadata: { org_id: orgId }
      });
      if (updateError) throw updateError;
      testUser = user;
      console.log(`Password updated successfully.`);
    }

    console.log("\n=======================================================");
    console.log("Credentials established:");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log("=======================================================\n");

  } catch (err) {
    console.error("Execution error:", err);
  } finally {
    await sql.end();
  }
}

main();
