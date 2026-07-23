import { registerAs } from '@nestjs/config';

/**
 * Reads the JWT signing secret from the environment and fails closed when it
 * is missing. There is deliberately no fallback default: a hardcoded secret
 * would let anyone forge access tokens if the environment were misconfigured.
 */
function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'JWT_SECRET environment variable is required and must be set to a strong random value',
    );
  }
  return secret;
}

export default registerAs('jwt', () => ({
  secret: requireJwtSecret(),
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
}));
