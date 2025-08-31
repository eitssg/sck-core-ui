// Standard OAuth 2.0 Types

export interface OAuthTokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
  scope?: string
}

export interface LoginResponse {
  user: UserProfile | null
  error?: string
  tokens?: OAuthTokenResponse
}

export interface SignupRequest {
  email: string
  password: string
  name: string
  confirmPassword?: string
}

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

export interface OAuthAuthorizeParams {
  response_type: 'code'
  client_id: string
  redirect_uri: string
  scope?: string
  state?: string
}

export interface OAuthTokenRequest {
  grant_type: 'authorization_code' | 'refresh_token'
  code?: string
  refresh_token?: string
  client_id: string
  client_secret?: string
  redirect_uri?: string
  state?: string
}
