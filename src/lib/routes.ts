// Centralized route builders for UI navigation
// Always use these to ensure consistent URL shapes and encoding

export function appDetailsPath(params: { portfolio: string; app: string }): string {
  const { portfolio, app } = params;
  // Client base path is handled by BrowserRouter basename; this returns a relative path
  return `/portfolios/${encodeURIComponent(portfolio)}/apps/${encodeURIComponent(app)}`;
}

export function portfolioDetailsPath(params: { portfolio: string }): string {
  const { portfolio } = params;
  return `/portfolios/${encodeURIComponent(portfolio)}`;
}

export function appCreatePath(params: { portfolio: string }): string {
  const { portfolio } = params;
  return `/portfolios/${encodeURIComponent(portfolio)}/apps/new`;
}
