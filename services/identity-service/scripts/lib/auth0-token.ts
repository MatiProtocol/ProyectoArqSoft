export type SimRole = 'client_individual' | 'client_company' | 'operator';

type CachedToken = { token: string; expiresAt: number };

type TokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

const cache = new Map<SimRole, CachedToken>();

const EXPIRY_SAFETY_MARGIN_MS = 60_000;

function credentialsFor(role: SimRole): { email: string; password: string } {
  const byRole: Record<SimRole, { emailVar: string; passwordVar: string }> = {
    client_individual: {
      emailVar: 'SIM_USER_INDIVIDUAL_EMAIL',
      passwordVar: 'SIM_USER_INDIVIDUAL_PASSWORD',
    },
    client_company: {
      emailVar: 'SIM_USER_COMPANY_EMAIL',
      passwordVar: 'SIM_USER_COMPANY_PASSWORD',
    },
    operator: { emailVar: 'SIM_USER_OPERATOR_EMAIL', passwordVar: 'SIM_USER_OPERATOR_PASSWORD' },
  };

  const { emailVar, passwordVar } = byRole[role];
  const email = process.env[emailVar];
  const password = process.env[passwordVar];

  if (!email || !password) {
    throw new Error(`Missing ${emailVar} / ${passwordVar} for role "${role}"`);
  }

  return { email, password };
}

export async function getAccessToken(role: SimRole): Promise<string> {
  const cached = cache.get(role);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_AUDIENCE;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;

  if (!domain || !audience || !clientId || !clientSecret) {
    throw new Error(
      'Missing AUTH0_DOMAIN / AUTH0_AUDIENCE / AUTH0_CLIENT_ID / AUTH0_CLIENT_SECRET'
    );
  }

  const { email, password } = credentialsFor(role);

  const response = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'password',
      username: email,
      password,
      audience,
      scope: 'openid profile email',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Auth0 token request failed for "${role}" (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as TokenResponse;
  cache.set(role, {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - EXPIRY_SAFETY_MARGIN_MS,
  });

  return data.access_token;
}
