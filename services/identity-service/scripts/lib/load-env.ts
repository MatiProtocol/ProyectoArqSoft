import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_PATH = resolve(__dirname, '../../../../.env');

if (existsSync(ENV_PATH)) {
  process.loadEnvFile(ENV_PATH);
  console.log(`Loaded env from ${ENV_PATH}`);
} else {
  console.warn(`No .env found at ${ENV_PATH}; relying on the current environment`);
}
