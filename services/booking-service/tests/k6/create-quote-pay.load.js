import { check } from 'k6';
import http from 'k6/http';
import { Trend } from 'k6/metrics';
import { getAccessToken } from './lib/auth0-token.js';

const BASE_URL = __ENV.BOOKING_URL || 'http://localhost:4002/api/v1/bookings';
const COMPANY_CATEGORY = __ENV.SIM_COMPANY_CATEGORY || 'Knitting & Crochet Supplies';

const companyCreateDuration = new Trend('company_create_duration', true);
const companyQuoteDuration = new Trend('company_quote_duration', true);
const companyPayDuration = new Trend('company_pay_duration', true);
const individualCreateDuration = new Trend('individual_create_duration', true);

const PAYMENT_OUTCOMES = ['accepted', 'rejected', 'pending', 'outage'];

const SMOKE = __ENV.K6_SMOKE === 'true';

const smokeScenarios = {
  smoke_company: {
    executor: 'constant-vus',
    vus: 5,
    duration: '30s',
    exec: 'reserveCompany',
  },
};

const fullScenarios = {
  normal_load: {
    executor: 'constant-arrival-rate',
    rate: 100,
    timeUnit: '1m',
    duration: '10m',
    preAllocatedVUs: 20,
    maxVUs: 100,
    exec: 'reserveCompany',
    startTime: '0s',
  },
  peak_load: {
    executor: 'constant-arrival-rate',
    rate: 5000,
    timeUnit: '1m',
    duration: '5m',
    preAllocatedVUs: 200,
    maxVUs: 2500,
    exec: 'reserveCompany',
    startTime: '11m',
  },
  individual_create: {
    executor: 'constant-arrival-rate',
    rate: 10,
    timeUnit: '1m',
    duration: '10m',
    preAllocatedVUs: 5,
    maxVUs: 20,
    exec: 'createIndividual',
    startTime: '0s',
  },
  list_proxy: {
    executor: 'constant-arrival-rate',
    rate: 60,
    timeUnit: '1m',
    duration: '10m',
    preAllocatedVUs: 10,
    maxVUs: 50,
    exec: 'listPreregistration',
    startTime: '0s',
  },
};

export const options = {
  scenarios: SMOKE ? smokeScenarios : fullScenarios,
  thresholds: {
    http_req_failed: ['rate<0.05'],
    company_create_duration: ['p(95)<1000'],
    individual_create_duration: ['p(95)<10000'],
    'http_req_duration{scenario:list_proxy}': ['p(95)<500'],
  },
};

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function futureDate() {
  return new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
}

export function setup() {
  const individualToken = getAccessToken('client_individual');
  const companyToken = getAccessToken('client_company');
  const headers = authHeaders(companyToken);

  const origin = http.post(
    `${BASE_URL}/company/preregistration/origins`,
    JSON.stringify({ coordinates: [-56.1645, -34.9011] }),
    { headers }
  );
  const destination = http.post(
    `${BASE_URL}/company/preregistration/destinations`,
    JSON.stringify({ coordinates: [-56.1875, -34.9156] }),
    { headers }
  );
  const item = http.post(
    `${BASE_URL}/company/preregistration/items`,
    JSON.stringify({
      description: 'insumos de tejido para envío frecuente',
      category: COMPANY_CATEGORY,
      size: 'medium',
    }),
    { headers }
  );

  const originId = origin.json('id');
  const destinationId = destination.json('id');
  const itemId = item.json('id');

  if (!originId || !destinationId || !itemId) {
    throw new Error(
      `Company preregistration failed in setup() — origin ${origin.status} ${origin.body}, ` +
        `destination ${destination.status} ${destination.body}, item ${item.status} ${item.body}`
    );
  }

  return { individualToken, companyToken, originId, destinationId, itemId };
}

export function reserveCompany(data) {
  const headers = authHeaders(data.companyToken);

  const createRes = http.post(
    `${BASE_URL}/company`,
    JSON.stringify({
      originId: data.originId,
      destinationId: data.destinationId,
      date: futureDate(),
      items: [{ registeredItemId: data.itemId }],
    }),
    { headers }
  );
  companyCreateDuration.add(createRes.timings.duration);

  const created = check(createRes, { 'company create 201': (r) => r.status === 201 });
  if (!created) return;

  const bookingId = createRes.json('bookingId');
  if (!bookingId) return;

  const quoteRes = http.post(`${BASE_URL}/${bookingId}/quote`, null, {
    headers,
    tags: { name: 'POST /bookings/:id/quote' },
  });
  companyQuoteDuration.add(quoteRes.timings.duration);
  check(quoteRes, { 'company quote 200': (r) => r.status === 200 });

  const outcome = PAYMENT_OUTCOMES[(__ITER || 0) % PAYMENT_OUTCOMES.length];
  const payRes = http.post(
    `${BASE_URL}/${bookingId}/pay`,
    JSON.stringify({ methodToken: 'tok_sim', simulateOutcome: outcome }),
    { headers, tags: { name: 'POST /bookings/:id/pay' } }
  );
  companyPayDuration.add(payRes.timings.duration);
  check(payRes, { 'company pay 200 or 202': (r) => r.status === 200 || r.status === 202 });
}

export function createIndividual(data) {
  const createRes = http.post(
    `${BASE_URL}/individual`,
    JSON.stringify({
      origin: [-56.1645, -34.9011],
      destination: [-56.1875, -34.9156],
      date: futureDate(),
      items: [{ description: 'monitor de computadora 24 pulgadas', value: '1500', size: 'medium' }],
    }),
    { headers: authHeaders(data.individualToken) }
  );
  individualCreateDuration.add(createRes.timings.duration);
  check(createRes, { 'individual create 201': (r) => r.status === 201 });
}

export function listPreregistration(data) {
  const res = http.get(`${BASE_URL}/company/preregistration`, {
    headers: authHeaders(data.companyToken),
  });
  check(res, { 'list 200': (r) => r.status === 200 });
}
