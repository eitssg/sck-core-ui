// Centralized data types for sck-core-ui
// Canonical API shapes use snake_case. UI slices/components may use PascalCase view types when needed.

// ---- OAuth 2.0 / OIDC Types ----
export interface OAuthTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope?: string
}

export interface OAuthErrorResponse {
  error: string
  error_description?: string
  error_uri?: string
  state?: string
}

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

export interface OAuthUserInfoResponse {
  sub: string
  email: string
  name: string
  given_name: string
  family_name: string
  preferred_username: string
  updated_at: number
}

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

export interface OAuthLogoutResponse {
  messge: string
  user?: string
}

export type OAuthResponse =
  | OAuthTokenResponse
  | OAuthIntrospectResponse
  | OAuthErrorResponse
  | OAuthUserInfoResponse
  | OAuthJWKSResponse
  | OAuthLogoutResponse

// ---- API response envelopes ----
export interface ApiResponse {
  status: string
  code: number
  message?: string
  links?: any
  metadata?: any
}

export interface ApiErrorResponse extends ApiResponse {
  errors?: string[]
}

export interface ApiListResponse<T> extends ApiResponse {
  data: T[]
}

export interface ApiItemResponse<T> extends ApiResponse {
  data: T
}

// ---- Auth endpoints ----
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse extends ApiResponse {
  data: {
    token: string
    expires_in: number
    token_type: string
  }
}

export interface SignupRequest {
  email: string
  password: string
  name: string
  confirmPassword?: string
}

// Canonical server profile shape (snake_case)
export interface UserProfile {
  user_id: string
  email?: string
  email_verified?: boolean
  email_verified_at?: string
  display_name?: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  theme?: string
  role?: string
  roles?: string[]
  permissions?: string[]

  // Temporary backwards-compat fields from older UI
  id?: string
  name?: string
  avatar?: string
}

// Local view model used by profileSlice (PascalCase). This intentionally mirrors
// the existing slice fields to minimize churn, while API stays snake_case.
export interface UserProfileView {
  UserId: string
  ProfileName: string
  Credentials?: Record<string, any>
  Identity?: Record<string, any>
  Email?: string
  DisplayName?: string
  FirstName?: string
  LastName?: string
  AvatarUrl?: string
  ProfileDescription?: string
  Timezone?: string
  Language?: string
  Theme?: string
  NotificationsEnabled?: boolean
  LastLogin?: string
  CreatedAt?: string
  UpdatedAt?: string
  AwsAccountId?: string
  AwsUserArn?: string
  AccessKeyPrefix?: string
  PreferredRegion?: string
  Permissions?: Record<string, any>
  Preferences?: Record<string, any>
  SessionCount?: number
  IsActive?: boolean

  // Cache metadata used only on client
  _cacheKey?: string
  _lastFetched?: number
}

// OAuth authorize and token request params
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
