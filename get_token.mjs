import { execSync } from 'child_process';

// Get the token from Vercel CLI config
const token = execSync('npx vercel whoami --token', { encoding: 'utf8' }).trim();
console.log('Token:', token);
