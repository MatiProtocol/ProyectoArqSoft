import http from 'k6/http';

const CREDENTIAL_VARS = {
  client_individual: {
    email: 'SIM_USER_INDIVIDUAL_EMAIL',
    password: 'SIM_USER_INDIVIDUAL_PASSWORD',
  },
  client_company: { email: 'SIM_USER_COMPANY_EMAIL', password: 'SIM_USER_COMPANY_PASSWORD' },
  operator: { email: 'SIM_USER_OPERATOR_EMAIL', password: 'SIM_USER_OPERATOR_PASSWORD' },
};

export function getAccessToken(role) {
  const domain = __ENV.AUTH0_DOMAIN;
  const audience = __ENV.AUTH0_AUDIENCE;
  const clientId = __ENV.AUTH0_CLIENT_ID;
  const clientSecret = __ENV.AUTH0_CLIENT_SECRET;

  if (!domain || !audience || !clientId || !clientSecret) {
    throw new Error(
      'Missing AUTH0_DOMAIN / AUTH0_AUDIENCE / AUTH0_CLIENT_ID / AUTH0_CLIENT_SECRET'
    );
  }

  const vars = CREDENTIAL_VARS[role];
  if (!vars) {
    throw new Error(`Unknown role "${role}"`);
  }

  const email = __ENV[vars.email];
  const password = __ENV[vars.password];
  if (!email || !password) {
    throw new Error(`Missing ${vars.email} / ${vars.password} for role "${role}"`);
  }

  const res = http.post(
    `https://${domain}/oauth/token`,
    JSON.stringify({
      grant_type: 'password',
      username: email,
      password: password,
      audience: audience,
      scope: 'openid profile email',
      client_id: clientId,
      client_secret: clientSecret,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status !== 200) {
    throw new Error(`Auth0 token request failed for "${role}" (${res.status}): ${res.body}`);
  }

  return res.json('access_token');
}
