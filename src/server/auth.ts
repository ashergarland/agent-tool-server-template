import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { AppConfig } from '../config/index.js';
import { unauthorized } from '../errors.js';

export interface Principal {
  readonly id: string;
  readonly kind: 'api-key' | 'anonymous';
}

export interface Authenticator {
  authenticate(request: FastifyRequest): Promise<Principal>;
}

const hmacKey = randomBytes(32);
const digest = (value: string): Buffer =>
  createHmac('sha256', hmacKey).update(value, 'utf8').digest();
const equals = (left: string, right: string): boolean =>
  timingSafeEqual(digest(left), digest(right));
const fingerprint = (value: string): string => digest(value).toString('hex').slice(0, 12);

const credential = (request: FastifyRequest): string | undefined => {
  const authorization = request.headers.authorization;
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim() || undefined;
  }
  const apiKey = request.headers['x-api-key'];
  return typeof apiKey === 'string' && apiKey.length > 0 ? apiKey : undefined;
};

class DisabledAuthenticator implements Authenticator {
  public authenticate(): Promise<Principal> {
    return Promise.resolve({ id: 'anonymous', kind: 'anonymous' });
  }
}

class ApiKeyAuthenticator implements Authenticator {
  public constructor(private readonly apiKeys: readonly string[]) {}

  public authenticate(request: FastifyRequest): Promise<Principal> {
    const presented = credential(request);
    if (!presented) throw unauthorized('Missing bearer token or x-api-key header');
    if (!this.apiKeys.some((candidate) => equals(candidate, presented))) {
      throw unauthorized('Invalid API key');
    }
    return Promise.resolve({ id: `key:${fingerprint(presented)}`, kind: 'api-key' });
  }
}

export const createAuthenticator = (config: AppConfig): Authenticator =>
  config.auth.mode === 'disabled'
    ? new DisabledAuthenticator()
    : new ApiKeyAuthenticator(config.auth.apiKeys);
