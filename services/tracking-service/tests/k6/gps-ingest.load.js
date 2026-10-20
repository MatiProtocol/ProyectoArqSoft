import { check, sleep } from 'k6';
import http from 'k6/http';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4004';
const DEVICE_SECRET = __ENV.DEVICE_SECRET || 'dev-secret';
const TRANSFER_ID = __ENV.TRANSFER_ID || '000000000000000000000000';
const VEHICLE_ID = Number(__ENV.VEHICLE_ID || 1);
const DEVICE_ID = __ENV.DEVICE_ID || 'GPS-001';

export const options = {
  scenarios: {
    normal_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
      exec: 'ingest',
      startTime: '0s',
    },
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '20s', target: 2500 },
        { duration: '30s', target: 2500 },
        { duration: '10s', target: 0 },
      ],
      exec: 'ingest',
      startTime: '35s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
  },
};

export function ingest() {
  const payload = JSON.stringify({
    transferId: TRANSFER_ID,
    vehicleId: VEHICLE_ID,
    deviceId: DEVICE_ID,
    coordinates: [-56.1645 + Math.random() * 0.02, -34.9011 + Math.random() * 0.02],
    timestamp: new Date().toISOString(),
  });

  const res = http.post(`${BASE_URL}/api/v1/tracking/gps/reading`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-device-secret': DEVICE_SECRET,
    },
  });

  check(res, {
    'status is 202': (r) => r.status === 202,
  });

  sleep(10);
}
