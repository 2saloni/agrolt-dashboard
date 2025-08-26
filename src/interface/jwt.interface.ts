/**
 * Payload interface for JWT access tokens
 */
export interface AccessTokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Payload interface for JWT refresh tokens
 */
export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}
