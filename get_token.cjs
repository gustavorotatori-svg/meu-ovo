import { execSync } from 'child_process';

// Get the Vercel token by running the CLI's config command
const homeDir = process.env.USERPROFILE || process.env.HOME;
const vercelDir = require('path').join(homeDir, '.vercel');

try {
  const config = require(require('path').join(vercelDir, 'config.json'));
  console.log(JSON.stringify({ token: config.token }));
} catch {
  // Try finding it via the Vercel CLI's internal config
  const result = execSync('npx vercel whoami --debug 2>&1', { encoding: 'utf8' });
  const match = result.match(/token=([^\s]+)/);
  if (match) {
    console.log(JSON.stringify({ token: match[1] }));
  } else {
    // Try to read from auth.json
    try {
      const auth = require(require('path').join(vercelDir, 'auth.json'));
      console.log(JSON.stringify({ token: auth.token }));
    } catch {
      console.log(JSON.stringify({ error: 'Token not found' }));
    }
  }
}
