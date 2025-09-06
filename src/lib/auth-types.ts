// Standard OAuth 2.0 Types

import { string } from "zod"

/* Successful response for OAuth 2.0 token endpoint (RFC 6749 Section 5.1) */
export interface OAuthTokenResponse {
  access_token: string  // JWT API access token. (NOT a session token.  The Login request returns a session token)
  token_type: string  // e.g., "Bearer"
  expires_in: number  // in seconds
  refresh_token: string // JWT refresh token
  scope?: string // space-separated scopes (e.g. "read write")
}

/* Error response for OAuth 2.0 token endpoint (RFC 6749 Section 5.2)

  Http Status Code   Error attribute
  400:               "invalid_request",
  401:               "invalid_client",
  403:               "access_denied",
  404:               "invalid_request",
  500:               "server_error",
  502:               "temporarily_unavailable",
  503:               "temporarily_unavailable",
*/

export interface OAuthErrorResponse {
  error: string
  error_description?: string
  error_uri?: string
  state?: string
}

/* Successful response for OAuth 2.0 token introspection endpoint (RFC 7662 Section 2.2) */
export interface OAuthIntrospectResponse {
  active: boolean
  client_id: string
  username: string
  scope: string[]
  exp: number
  iat: number
  sub: string
  aud: string
  iss: string
  [key: string]: any
}

/* Successful response for OpenID Connect UserInfo endpoint (OpenID Connect Core 1.0 Section 5.3) */
export interface OAuthUserInfoResponse {
  sub: string
  email: string
  name: string
  given_name: string
  family_name: string
  preferred_username: string
  updated_at: number
}

/* Successful response for OpenID Connect JWKS endpoint (OpenID Connect Core 1.0 Section 10.1) */
export interface OAuthJWKSResponse {
  keys: Array<{
    kty: string
    use: string
    kid: string
    alg: string
    n: string
    e: string
    [key: string]: any
  }>
}

/* Successful response for OAuth 2.0 logout endpoint (RFC 7009 Section 2.2) */
export interface OAuthLogoutResponse {
  messge: string
  user?: string
}

export type OAuthResponse = OAuthTokenResponse | OAuthIntrospectResponse | OAuthErrorResponse | OAuthUserInfoResponse | OAuthJWKSResponse | OAuthLogoutResponse

/* Common attribute for Core Automation API responses */
export interface ApiResponse {
  status: string; // "ok" | "error"
  code: number;  // HTTP status code
  // data: any; // defined in subclasses
  message?: string; // Optional message
  links?: any; // Optional links object
  metadata?: any; // Optional metadata object
}

/* Error response for Core Automation API.  Includes a list of errors that caused this response */
export interface ApiErrorResponse extends ApiResponse {
  errors?: Array<string>
}

/* Login POST body */
export interface LoginRequest {
  email: string
  password: string
}

/* Login response includes a session token (NOT an access token) */
export interface LoginResponse extends ApiResponse {
  data: {
    token: string // JWT session token (NOT an access token.  You must have an access token for API calls)
    expires_in: number // in seconds
    token_type: string // e.g., "Bearer"
  }
}

/* Signup POST body */
export interface SignupRequest {
  email: string
  password: string
  name: string
  confirmPassword?: string
}

/* User profile returned from /auth/v1/me */
export interface UserProfile {
  id: string
  email: string
  name: string
  avatar?: string
  theme?: string
  role?: string
  roles?: string[]
  permissions?: string[]
}

/* OAuth 2.0 Authorization Request Parameters (RFC 6749 Section 4.1.1) */
export interface OAuthAuthorizeParams {
  response_type: 'code'
  client_id: string
  redirect_uri: string
  scope?: string
  state?: string
}

/* OAuth 2.0 Token Request Parameters (RFC 6749 Section 4.1.3 and 6) */
export interface OAuthTokenRequest {
  grant_type: 'authorization_code' | 'refresh_token'
  code?: string
  refresh_token?: string
  client_id: string
  client_secret?: string
  redirect_uri?: string
  state?: string
}
