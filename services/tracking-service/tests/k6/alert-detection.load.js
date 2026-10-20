import { check, sleep } from 'k6';
import http from 'k6/http';
import { Trend } from 'k6/metrics';
import { getAccessToken } from './lib/auth0-token.js';

const TRACKING_URL = __ENV.TRACKING_URL || 'http://localhost:4004/api/v1/tracking';
const GPS_URL = `${TRACKING_URL}/gps/reading`;
const ACTIVE_URL = `${TRACKING_URL}/active-transfers`;
const DEVICE_SECRET = __ENV.GPS_DEVICE_SECRET || 'dev-secret';
const TRANSFER_ID = __ENV.TRANSFER_ID || '000000000000000000000000';
const VEHICLE_ID = Number(__ENV.VEHICLE_ID || 1);
const DEVICE_ID = __ENV.DEVICE_ID || 'GPS-001';
const RED_ZONE_COORD = [
  Number(__ENV.RED_ZONE_LNG || -56.2009),
  Number(__ENV.RED_ZONE_LAT || -34.8721),
];

const ALERT_BUDGET_MS = 5000;
const POLL_INTERVAL_MS = 500;

const timeToAlert = new Trend('alert_time_to_detection', true);

export const options = {
  scenarios: {
    detect_alert: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 5,
      exec: 'detect',
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
  },
};

export function setup() {
  return { operatorToken: getAccessToken('operator') };
}

function sendRedZoneReading() {
  return http.post(
    GPS_URL,
    JSON.stringify({
      transferId: TRANSFER_ID,
      vehicleId: VEHICLE_ID,
      deviceId: DEVICE_ID,
      coordinates: RED_ZONE_COORD,
      timestamp: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json', 'x-device-secret': DEVICE_SECRET } }
  );
}

export function detect(data) {
  const startedAt = Date.now();
  sendRedZoneReading();

  const headers = { Authorization: `Bearer ${data.operatorToken}` };
  let detected = false;

  while (Date.now() - startedAt < ALERT_BUDGET_MS) {
    const res = http.get(`${ACTIVE_URL}?hasActiveAlerts=true`, { headers });
    if (res.status === 200) {
      const transfers = res.json();
      if (Array.isArray(transfers) && transfers.some((t) => t.bookingId && t.hasActiveAlerts)) {
        detected = true;
        break;
      }
    }
    sleep(POLL_INTERVAL_MS / 1000);
  }

  const elapsed = Date.now() - startedAt;
  if (detected) timeToAlert.add(elapsed);
  check(detected, { 'alert detected within 5s': (ok) => ok === true });
}
