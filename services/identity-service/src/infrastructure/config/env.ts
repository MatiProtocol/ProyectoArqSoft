export const env = {
  MONGO_URL: process.env.MONGO_URL,

  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE ? process.env.AUTH0_AUDIENCE : 'your-auth0-domain',
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN ? process.env.AUTH0_DOMAIN : 'your-auth0-domain',
};
