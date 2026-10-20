const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const targets = [];
if (process.env.SIM_INCLUDE_USERS === 'true') {
  targets.push({ name: 'users', cwd: 'services/identity-service' });
}
targets.push({ name: 'client', cwd: 'services/booking-service' });
if (process.env.SIM_INCLUDE_GPS === 'true') {
  targets.push({ name: 'gps', cwd: 'services/tracking-service' });
}

const children = [];

function start(target) {
  const child = spawn(npm, ['run', 'simulator'], {
    cwd: path.join(ROOT, target.cwd),
    env: process.env,
    shell: false,
  });

  const prefix = `[${target.name}]`;
  child.stdout.on('data', (chunk) => process.stdout.write(prefixLines(prefix, chunk)));
  child.stderr.on('data', (chunk) => process.stderr.write(prefixLines(prefix, chunk)));
  child.on('exit', (code) => console.log(`${prefix} exited with code ${code}`));

  children.push(child);
}

function prefixLines(prefix, chunk) {
  return chunk
    .toString()
    .split('\n')
    .map((line) => (line.length > 0 ? `${prefix} ${line}` : line))
    .join('\n');
}

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nrun-demo received ${signal}, stopping ${children.length} simulator(s)...`);
  for (const child of children) {
    child.kill(signal);
  }
  setTimeout(() => process.exit(0), 3000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log(`run-demo starting ${targets.length} simulator(s): ${targets.map((t) => t.name).join(', ')}`);
for (const target of targets) {
  start(target);
}
