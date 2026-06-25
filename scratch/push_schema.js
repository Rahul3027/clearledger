const { spawn } = require('child_process');
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

console.log("Running drizzle-kit push --force...");
const child = spawn('npx', ['drizzle-kit', 'push', '--force'], {
  env: process.env,
  shell: true,
  stdio: 'inherit'
});

child.on('close', (code) => {
  console.log(`drizzle-kit push exited with code ${code}`);
  process.exit(code);
});
