import { string } from "zod";

// ==========================
// OAuth 2.0 / OIDC Types
// ==========================
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope?: string;
}

export interface OAuthErrorResponse {
  error: string;
  error_description?: string;
  error_uri?: string;
  state?: string;
}

export interface OAuthIntrospectResponse {
  active: boolean;
  client_id: string;
  username: string;
  scope: string[];
  exp: number;
  iat: number;
  sub: string;
  aud: string;
  iss: string;
  [key: string]: any;
}

export interface OAuthUserInfoResponse {
  sub: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  preferred_username: string;
  updated_at: number;
}

export interface OAuthJWKSResponse {
  keys: Array<{
    kty: string;
    use: string;
    kid: string;
    alg: string;
    n: string;
    e: string;
    [key: string]: any;
  }>;
}

export interface OAuthLogoutResponse {
  messge: string; // note: matches backend spelling if any
  user?: string;
}

export type OAuthResponse =
  | OAuthTokenResponse
  | OAuthIntrospectResponse
  | OAuthErrorResponse
  | OAuthUserInfoResponse
  | OAuthJWKSResponse
  | OAuthLogoutResponse;

export interface OAuthAuthorizeParams {
  response_type: "code";
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
}

export interface OAuthTokenRequest {
  grant_type: "authorization_code" | "refresh_token";
  code?: string;
  refresh_token?: string;
  client_id: string;
  client_secret?: string;
  redirect_uri?: string;
  state?: string;
}

// ==========================
// Shared API envelope types
// ==========================
export interface ApiResponse<T> {
  data: T | T[];
  message?: string;
  metadata?: { cursor?: string | null };
}

export interface ApiError {
  status: number;
  message?: string;
  data?: unknown;
}

// Base state interface for all slices
export interface BaseState {
  loading: boolean;
  error: string | null;
}

// List state interface for collection slices
export interface ListState<T> extends BaseState {
  items: T[];
  selectedItem: T | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

// Detail state interface for individual item slices
export interface DetailState<T> extends BaseState {
  data: T | null;
  lastFetched: string | null;
}

export interface ClientList {
  items: Client[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

// Client interface matching Python ClientFact model
export interface Client {
  // Primary identifier (matches Python 'client' field)
  client: string; // This is the hash key in DynamoDB the client 'slug'

  // Core client metadata
  client_id?: string; // This Id represents the client's user interface Oauth Client_ID
  client_secret?: string;  // The client's Oauth password
  client_scopes?: string[];  // Oauth Scopes
  client_redirect_urls?: string[];  // Oauth Redirect URLs

  client_type?: string;
  client_status?: 'active' | 'inactive' | 'suspended';
  client_name?: string;
  client_description?: string;

  // AWS Organization configuration
  organization_id?: string;
  organization_name?: string;
  organization_account?: string;
  organization_email?: string;

  // Domain and networking
  domain?: string;
  homepage?: string;

  // AWS Account assignments for multi-account architecture
  iam_account?: string;
  audit_account?: string;
  automation_account?: string;
  security_account?: string;
  network_account?: string;

  // Regional configuration
  master_region?: string;
  client_region?: string;
  bucket_region?: string;

  // S3 bucket configuration
  bucket_name?: string;
  docs_bucket_name?: string;
  artefact_bucket_name?: string;
  ui_bucket_name?: string;
  ui_bucket?: string; // Legacy field

  // Resource naming
  scope?: string;

  // Audit fields (inherited from DatabaseRecord)
  created_at?: string;
  updated_at?: string;
}

export interface UserProfileList {
  items: UserProfile[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

// Updated UserProfile interface to match Python ProfileModel
export interface UserProfile {
  // Primary key fields
  user_id: string;
  profile_name: string;

  // Credentials and identity
  credentials?: Record<string, any>; // User password, aws credentials, etc. (encrypted)
  identity?: Record<string, any>;  // AWS user identity

  // Basic profile information
  email?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  profile_description?: string;

  // User preferences (can differ per profile)
  timezone?: string;
  language?: string;
  theme?: string;
  notifications_enabled?: boolean;

  // Timestamps (per profile)
  last_login?: string;
  created_at?: string;
  updated_at?: string;

  // AWS-specific information
  aws_account_id?: string;
  aws_user_arn?: string;
  access_key_prefix?: string;
  preferred_region?: string;

  // Profile-specific attributes
  permissions?: Record<string, any>;
  preferences?: Record<string, any>;

  // Usage tracking (per profile)
  session_count?: number;
  is_active?: boolean;

  // MFA fields (added server-side)
  mfa_enabled?: boolean;
  mfa_methods?: string[];
  totp_secret?: string; // not normally returned; included here for shape completeness
  recovery_codes?: string[];
}

// Client-side cached variant with metadata


// Nested types matching core_db/registry/portfolio/models.py (PortfolioFact)
export interface PortfolioContact {
  name: string;
  email?: string;
  attributes?: Record<string, string>;
  enabled: boolean;
}

export interface PortfolioApprover {
  sequence: number;
  name: string;
  email?: string;
  roles?: string[];
  attributes?: Record<string, string>;
  depends_on?: number[];
  enabled: boolean;
}

export interface PortfolioOwner {
  name: string;
  email?: string;
  phone?: string;
  attributes?: Record<string, string>;
}

export interface PortfolioProject {
  name: string;
  code: string;
  repository?: string;
  description?: string;
  attributes?: Record<string, string>;
}

export interface PortfolioList {
  items: Portfolio[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

// Replace the old Portfolio interface with the model-accurate one
export interface Portfolio {
  // Key
  client: string  // this is the client slug holding this portfolio
  portfolio: string; // Name of the portfolio "slug".  short and lowercase

  // Configuration
  contacts?: PortfolioContact[];
  approvers?: PortfolioApprover[];
  project?: PortfolioProject;
  domain?: string;
  bizapp?: PortfolioProject;
  owner?: PortfolioOwner;
  // Catalog ownership extensions
  business_owner?: PortfolioOwner;
  technical_owner?: PortfolioOwner;

  // Metadata
  tags?: Record<string, string>;
  metadata?: Record<string, string>;
  attributes?: Record<string, string>;
  compliance?: Record<string, string>;
  identifiers?: Record<string, string>;
  user_instantiated?: string;

  // Catalog identity/presentation
  icon_url?: string;
  category?: string;
  labels?: string[];
  portfolio_version?: string;
  lifecycle_status?: string;

  // Optional integration fields
  links?: Record<string, any> | any[];
  dependencies?: string[] | any[];

  // Audit (from DatabaseRecord)
  created_at?: string;
  updated_at?: string;

  // UI-derived helpers (not persisted)
  id?: string;
  name?: string;
  description?: string;
  code?: string;
  status?: string;
  clientId?: string;
  applicationCount?: number;
  lastUpdated?: string;
  homePageUrl?: string;
}

export interface ApplicationList {
  items: Application[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

// Replace the old Application interface with the model-accurate one
export interface Application {
  // Keys
  portfolio: string;       // Hash key / portfoluio slug this app linked to
  app_regex: string;       // Range key regular expression matching one or more deployment unit (app)

  // App configuration
  name?: string;           // Descriptive name for the App or Apps matching the app_regex
  environment?: string;
  account?: string;        // AWS account ID associated with the App (defiend by the zone).. this is only informational
  zone: string;            // Zone where the app deployment unit will be deployed (aws account, region(s) (more than one), network, etc)
  region: string;          // Specify which region in the zone to deploy this to.  MUST match a region name defined in the zone
  repository?: string;     // The artefact repository where to find the "install.exe" for this deployment
  enforce_validation?: string;  // if any template fails compilation, fail the deployment

  // Complex attributes
  image_aliases?: Record<string, string>;  // If you know what type of EC2 you want, specify the image name here (in the zone)
  tags?: Record<string, string>;  // Tags to add to all resources in the deployment
  metadata?: Record<string, string>;  // Miscellaneous metadata for use by your templates

  // Audit (from DatabaseRecord)
  created_at?: string;
  updated_at?: string;
}

// Zone nested types matching core_db/registry/zone/models.py (ZoneFact)
export interface SecurityAliasFacts {
  type: string;
  value: string;
  description?: string;
}

export interface KmsFacts {
  aws_account_id: string;
  kms_key_arn?: string;
  kms_key?: string;
  delegate_aws_account_ids: string[];
  allow_sns?: boolean;
}

export interface ProxyFacts {
  host?: string;
  port?: string;
  url?: string;
  no_proxy?: string;
}

export interface AccountFacts {
  organizational_unit?: string;
  aws_account_id: string;
  account_name?: string;
  environment?: string;
  kms?: KmsFacts;
  resource_namespace?: string;
  network_name?: string;
  vpc_aliases?: string[];
  subnet_aliases?: string[];
  tags?: Record<string, any>;
}

export interface RegionFacts {
  aws_region: string;
  az_count?: number;
  image_aliases?: Record<string, string>;
  min_successful_instances_percent?: number;
  security_aliases?: Record<string, SecurityAliasFacts[]>;
  security_group_aliases?: Record<string, string>;
  proxy?: ProxyFacts[];
  proxy_host?: string;
  proxy_port?: number;
  proxy_url?: string;
  no_proxy?: string;
  name_servers?: string[];
  tags?: Record<string, any>;
}

export interface ZoneList {
  items: ZoneFact[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

// Canonical Zone fact interface (backend-aligned)
export interface ZoneFact {
  client: string;  // required client slug to group by client
  zone: string;    // Zone identifier.  keep it short, lowercase, and slug-like...but this is not a slug

  account_facts: AccountFacts; // AWS account & kms configuration
  region_facts: Record<string, RegionFacts>; // Regions, network & security per region
  tags?: Record<string, any>;  // Global tags for zone resources

  created_at?: string;
  updated_at?: string;
}

// Backward compatibility alias (old name). Remove once all imports use ZoneFact directly.
export type Zone = ZoneFact;

/* Above is the registry of clients (AWS Organization), zones, applications deployment units and application definitions

/* Below describes actual deployments */

export interface PortfolioDeploymentList {
  items: PortfolioDeployment[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

// The actual Portfolio (Business Application) that was deployed...and when
export interface PortfolioDeployment {
  prn: string; // the Portfolio prn 'prn:<portfolio name>'
  parent_prn: string; // always 'prn'
  name: string; // portfolio name.  Link to Portfolio.portfolio
  item_type: string;  // should ALWAYS be 'portfolio'
  metadata: any; // a dictionary of metadata for the portfolio

  contact_email: string; // required contact details

  created_at: string;
  updated_at: string;
}

export interface AppsDeployedList {
  items: AppDeployed[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

// The deployment unit or the "app". 
export interface AppDeployed {
  prn: string; // the App prn 'prn:<portfolio name>:<app name>'
  parent_prn: string; // portfolio prn 'prn:<portfolio name>'
  name: string; // app name deployed
  item_type: string;  // should ALWAYS be 'app'
  metadata: any; // a dictionary of metadata for the app

  contact_email: string; // required contact details
  portfolio_prn: string; // portfolio prn 'prn:<portfolio name>'

  created_at: string;
  updated_at: string;
}

export interface AppDeploymentBranchesList {
  items: AppDeploymentBranches[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export interface AppDeploymentBranches {
  prn: string; // prn of the branch deployment 'prn:<portfolio name>:<app name>:<branch name>'
  parent_prn: string; // app prn 'prn:<portfolio name>:<app name>'
  name: string; // branch name deployed
  item_type: string;  // should ALWAYS be 'branch'
  metadata: any; // a dictionary of metadata for the branch

  portfolio_prn: string; // portfolio prn 'prn:<portfolio name>'
  app_prn: string; // app prn 'prn:<portfolio name>:<app name>'
  
  // Build release information
  short_name: string; // a shortened name for the project branch
  released_build: any; // some information about the released build AppDeploymentBuild
  
  created_at: string
  updated_at: string
}

export interface AppDeploymentBuildsList {
  items: AppDeploymentBuild[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export interface AppDeploymentBuild {
  prn: string; // the build prn 'prn:<portfolio name>:<app name>:<branch name>:<build name>'
  parent_prn: string; // app branch prn 'prn:<portfolio name>:<app name>:<branch name>'
  name: string; // build name deployed
  item_type: string;  // should ALWAYS be 'build'
  metadata: any; // a dictionary of metadata for the build


  portfolio_prn: string; // the portfolio prn 'prn:<portfolio name>'
  app_prn: string; // the app prn 'prn:<portfolio name>:<app name>'
  branch_prn: string; // the branch prn 'prn:<portfolio name>:<app name>:<branch name>'

  status: string;
  message: string;
  context: any; // Dictionary of all information related to the build

  created_at: string;
  updated_at: string;
}

export interface AppDeploymentComponentsList {
  items: AppDeploymentComponent[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export interface AppDeploymentComponent {
  prn: string; // the component prn 'prn:<portfolio name>:<app name>:<branch name>:<build name>:<component name>'
  parent_prn: string; // app build prn 'prn:<portfolio name>:<app name>:<branch name>:<build name>'
  name: string; // component name deployed (the name provided in the deployment template)
  item_type: string;  // should ALWAYS be 'component'
  metadata: any; // a dictionary of metadata for the component

  status: string;
  message?: string;
  component_type: string; // Should be one of: "ec2", "s3", "eni", "rds", "lambda", etc.
  image_id?: string;
  image_alias?: string;

  portfolio_prn: string; // The portfolio PRN that this component belongs to.
  app_prn: string; // The app PRN that this component belongs to.
  branch_prn: string; // The branch PRN that this component belongs to.
  build_prn: string; // The build PRN that this component belongs to.

  created_at: string;
  updated_at: string;
}

// ============================================================================
// (Removed duplicate strict variants; this single ZoneFact interface is canonical.)

