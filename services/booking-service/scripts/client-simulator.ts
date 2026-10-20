import './lib/load-env';
import { getAccessToken, type SimRole } from './lib/auth0-token';

type PaymentOutcome = 'accepted' | 'rejected' | 'pending' | 'outage';
type Scenario = 'individual' | 'company' | 'mixed';

const BOOKING_URL = process.env.BOOKING_URL ?? 'http://localhost:4002/api/v1/bookings';
const INTERVAL_MS = Number(process.env.SIM_INTERVAL_MS ?? 5000);
const SCENARIO = (process.env.SIM_SCENARIO as Scenario) ?? 'mixed';
const AMBIGUOUS_RATE = Number(process.env.SIM_DESCRIPTION_AMBIGUOUS_RATE ?? 0);
const COMPANY_CATEGORY = process.env.SIM_COMPANY_CATEGORY ?? 'Knitting & Crochet Supplies';

const PAYMENT_OUTCOMES: PaymentOutcome[] = ['accepted', 'rejected', 'pending', 'outage'];

const CLEAR_DESCRIPTIONS = [
  'sillón de tres plazas de madera',
  'monitor de computadora 24 pulgadas',
  'caja de documentación confidencial',
  'repuestos de motor en caja sellada',
];
const AMBIGUOUS_DESCRIPTIONS = ['cosa', 'eso', 'un paquete', '...'];

const ORIGIN: [number, number] = [-56.1645, -34.9011];
const DESTINATION: [number, number] = [-56.1875, -34.9156];

let cycle = 0;
const companyPreregistration = new Map<
  string,
  { originId: string; destinationId: string; itemId: string }
>();

function futureDate(): string {
  return new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
}

function nextDescription(): string {
  if (Math.random() < AMBIGUOUS_RATE) {
    return AMBIGUOUS_DESCRIPTIONS[cycle % AMBIGUOUS_DESCRIPTIONS.length];
  }
  return CLEAR_DESCRIPTIONS[cycle % CLEAR_DESCRIPTIONS.length];
}

function nextOutcome(): PaymentOutcome {
  return PAYMENT_OUTCOMES[cycle % PAYMENT_OUTCOMES.length];
}

async function api<T>(
  path: string,
  token: string,
  method: 'GET' | 'POST',
  body?: unknown
): Promise<{ status: number; data: T | null }> {
  const response = await fetch(`${BOOKING_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data: T | null = null;
  try {
    data = (await response.json()) as T;
  } catch {
    data = null;
  }
  return { status: response.status, data };
}

async function ensureCompanyPreregistration(token: string, role: SimRole): Promise<void> {
  if (companyPreregistration.has(role)) return;

  const origin = await api<{ id: string }>('/company/preregistration/origins', token, 'POST', {
    coordinates: ORIGIN,
  });
  const destination = await api<{ id: string }>(
    '/company/preregistration/destinations',
    token,
    'POST',
    { coordinates: DESTINATION }
  );
  const item = await api<{ id: string }>('/company/preregistration/items', token, 'POST', {
    description: 'insumos de tejido para envío frecuente',
    category: COMPANY_CATEGORY,
    size: 'medium',
  });

  if (!origin.data?.id || !destination.data?.id || !item.data?.id) {
    console.error('[company] preregistration failed', {
      origin: origin.status,
      destination: destination.status,
      item: item.status,
    });
    return;
  }

  companyPreregistration.set(role, {
    originId: origin.data.id,
    destinationId: destination.data.id,
    itemId: item.data.id,
  });
  console.log(`[company] preregistered origin/destination/item`);
}

async function runIndividualCycle(): Promise<void> {
  const startedAt = Date.now();
  const token = await getAccessToken('client_individual');

  const created = await api<{ bookingId: string }>('/individual', token, 'POST', {
    origin: ORIGIN,
    destination: DESTINATION,
    date: futureDate(),
    items: [{ description: nextDescription(), value: '1500', size: 'medium' }],
  });

  if (created.status !== 201 || !created.data?.bookingId) {
    console.log(`[individual] create -> ${created.status} (no bookingId, maybe pending F19)`);
    return;
  }
  await quoteAndPay('individual', created.data.bookingId, token, startedAt);
}

async function runCompanyCycle(): Promise<void> {
  const startedAt = Date.now();
  const role: SimRole = 'client_company';
  const token = await getAccessToken(role);
  await ensureCompanyPreregistration(token, role);

  const prereg = companyPreregistration.get(role);
  if (!prereg) return;

  const created = await api<{ bookingId: string }>('/company', token, 'POST', {
    originId: prereg.originId,
    destinationId: prereg.destinationId,
    date: futureDate(),
    items: [{ registeredItemId: prereg.itemId }],
  });

  if (created.status !== 201 || !created.data?.bookingId) {
    console.log(`[company] create -> ${created.status} (no bookingId)`);
    return;
  }
  await quoteAndPay('company', created.data.bookingId, token, startedAt);
}

async function quoteAndPay(
  label: string,
  bookingId: string,
  token: string,
  startedAt: number
): Promise<void> {
  const quote = await api<{ estimatedCost: number }>(`/${bookingId}/quote`, token, 'POST');
  const outcome = nextOutcome();
  const pay = await api<{ bookingStatus: string }>(`/${bookingId}/pay`, token, 'POST', {
    methodToken: 'tok_sim',
    simulateOutcome: outcome,
  });
  const elapsedMs = Date.now() - startedAt;
  console.log(
    `[${label}] booking ${bookingId} | quote ${quote.status} (cost ${quote.data?.estimatedCost ?? '?'}) | ` +
      `pay ${pay.status} outcome=${outcome} status=${pay.data?.bookingStatus ?? '?'} | ${elapsedMs}ms`
  );
}

async function tick(): Promise<void> {
  cycle += 1;
  try {
    const runCompany = SCENARIO === 'company' || (SCENARIO === 'mixed' && cycle % 2 === 0);
    if (runCompany) {
      await runCompanyCycle();
    } else {
      await runIndividualCycle();
    }
  } catch (error) {
    console.error('[client-simulator] cycle failed', error);
  }
}

function main(): void {
  console.log(
    `Starting client simulator: scenario ${SCENARIO}, interval ${INTERVAL_MS}ms, target ${BOOKING_URL}`
  );
  void tick();
  setInterval(() => void tick(), INTERVAL_MS);
}

main();
