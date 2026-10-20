import './lib/load-env';
import { getAccessToken, type SimRole } from './lib/auth0-token';

const IDENTITY_URL = process.env.IDENTITY_URL ?? 'http://localhost:4001/api/v1/identity';

type ProfileSeed = {
  role: SimRole;
  emailVar: string;
  name: string;
  phone: string;
  city: string;
  registerRoles?: string[];
};

const PROFILES: ProfileSeed[] = [
  {
    role: 'client_individual',
    emailVar: 'SIM_USER_INDIVIDUAL_EMAIL',
    name: 'Sim Individual',
    phone: '099000001',
    city: 'Montevideo',
    registerRoles: ['client_individual'],
  },
  {
    role: 'client_company',
    emailVar: 'SIM_USER_COMPANY_EMAIL',
    name: 'Sim Company',
    phone: '099000002',
    city: 'Montevideo',
    registerRoles: ['client_company'],
  },
  {
    role: 'operator',
    emailVar: 'SIM_USER_OPERATOR_EMAIL',
    name: 'Sim Operator',
    phone: '099000003',
    city: 'Montevideo',
  },
];

async function registerProfile(seed: ProfileSeed): Promise<void> {
  const email = process.env[seed.emailVar];
  if (!email) {
    console.error(`[${seed.role}] missing ${seed.emailVar}, skipping`);
    return;
  }

  const token = await getAccessToken(seed.role);
  const response = await fetch(`${IDENTITY_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email,
      name: seed.name,
      phone: seed.phone,
      city: seed.city,
      roles: seed.registerRoles,
    }),
  });

  const detail = await response.text();

  const alreadyRegistered = response.status >= 400 && detail.includes('E11000');
  if (alreadyRegistered) {
    console.log(`[${seed.role}] ${email} -> already registered (ok)`);
  } else if (response.status < 300) {
    console.log(`[${seed.role}] register ${email} -> ${response.status} ok`);
  } else {
    console.error(`[${seed.role}] register ${email} -> ${response.status} ${detail}`);
    return;
  }

  if (seed.role === 'operator') {
    console.log(
      `[operator] assign the 'operator' role with PATCH /users/roles as an admin if not done yet`
    );
  }
}

async function main(): Promise<void> {
  console.log(`Starting user simulator: registering SIM_USER_* profiles at ${IDENTITY_URL}`);
  for (const seed of PROFILES) {
    try {
      await registerProfile(seed);
    } catch (error) {
      console.error(`[${seed.role}] register failed`, error);
    }
  }
  console.log('User simulator done.');
}

void main();
