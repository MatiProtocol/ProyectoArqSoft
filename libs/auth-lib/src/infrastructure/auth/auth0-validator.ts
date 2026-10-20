import { ErrorFactory } from '@move/errors-lib';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { env } from '../config/env';

const client = jwksClient({
  jwksUri: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: env.CACHE_MAX_ENTRIES,
  cacheMaxAge: env.CACHE_MAX_AGE,
  timeout: env.TIMEOUT_CACHE,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function validateTokenWithAuth0(token: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: env.AUTH0_AUDIENCE,
        issuer: `https://${env.AUTH0_DOMAIN}/`,
        algorithms: ['RS256'],
      },
      (err) => {
        if (err) {
          if (
            err.name === 'TokenExpiredError' ||
            err.name === 'JsonWebTokenError' ||
            err.name === 'NotBeforeError'
          ) {
            return reject(ErrorFactory.unauthorized(err.message));
          }

          if (
            err.name === 'TimeoutError' ||
            (err as any).code === 'ECONNREFUSED' ||
            (err as any).code === 'ETIMEDOUT' ||
            err.message?.includes('connect ECONNREFUSED') ||
            err.message?.includes('getaddrinfo ENOTFOUND')
          ) {
            return reject(
              ErrorFactory.externalService('Auth0', 'Authentication service unreachable', err, {
                endpoint: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
              })
            );
          }

          return reject(ErrorFactory.externalService('Auth0', err.message, err));
        }

        resolve();
      }
    );
  });
}
