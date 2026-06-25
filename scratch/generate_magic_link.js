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
      let value = match[1] === 'DATABASE_URL' ? line.substring(line.indexOf('=') + 1).trim() : match[2] || '';
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
    // 1. Resolve or Create an Organisation in the database
    let orgId = "00000000-0000-0000-0000-000000000001";
    const orgs = await sql`SELECT id FROM organisations LIMIT 1`;
    if (orgs.length > 0) {
      orgId = orgs[0].id;
      console.log(`Found existing organisation ID: ${orgId}`);
    } else {
      console.log(`No organisation found. Inserting default demo organisation...`);
      await sql`
        INSERT INTO organisations (id, name, country_code)
        VALUES (${orgId}, 'Demo Corp', 'US')
        ON CONFLICT (id) DO NOTHING
      `;
      console.log(`Created demo organisation ID: ${orgId}`);
    }

    // 2. Ensure default entity exists
    const matchedEntities = await sql`SELECT id FROM entities WHERE org_id = ${orgId} LIMIT 1`;
    if (matchedEntities.length === 0) {
      console.log(`Inserting default entity...`);
      await sql`
        INSERT INTO entities (id, org_id, legal_name, country_code)
        VALUES ('00000000-0000-0000-0000-000000000002', ${orgId}, 'Default Legal Entity', 'US')
        ON CONFLICT DO NOTHING
      `;
    }

    // 3. Ensure default connector exists
    const matchedConnectors = await sql`SELECT id FROM connectors WHERE org_id = ${orgId} LIMIT 1`;
    if (matchedConnectors.length === 0) {
      console.log(`Inserting default manual ingestion connector...`);
      await sql`
        INSERT INTO connectors (id, org_id, entity_id, slug, display_name, connector_type, auth_scheme, status, config)
        VALUES (
          '00000000-0000-0000-0000-000000000003',
          ${orgId},
          '00000000-0000-0000-0000-000000000002',
          'excel-csv-v1',
          'Manual Upload Connector',
          'EXCEL_CSV',
          'NONE',
          'ACTIVE',
          '{}'::jsonb
        )
        ON CONFLICT DO NOTHING
      `;
    }

    // 4. Initialize Supabase Admin client
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const email = "test@clearledger.com";

    // 5. Check if user already exists in Supabase
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    let testUser = users.find(u => u.email === email);

    if (!testUser) {
      console.log(`Creating user ${email}...`);
      const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { org_id: orgId }
      });
      if (createError) throw createError;
      testUser = user;
      console.log(`Created user ${email} with ID: ${testUser.id}`);
    } else {
      console.log(`User ${email} already exists. Updating metadata with org_id: ${orgId}...`);
      const { data: { user }, error: updateError } = await supabase.auth.admin.updateUserById(testUser.id, {
        user_metadata: { org_id: orgId }
      });
      if (updateError) throw updateError;
      testUser = user;
      console.log(`Updated user metadata.`);
    }

    // 6. Generate Magic Link
    console.log(`Generating magic link for ${email}...`);
    const { data, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: 'http://localhost:3000/auth/callback'
      }
    });

    if (linkError) throw linkError;

    console.log("\n======================================================================================");
    console.log("SUCCESS! Copy and paste this magic login link directly into your browser to log in:");
    console.log("======================================================================================");
    console.log(data.properties.action_link);
    console.log("======================================================================================\n");

  } catch (err) {
    console.error("Execution error:", err);
  } finally {
    await sql.end();
  }
}

main();
