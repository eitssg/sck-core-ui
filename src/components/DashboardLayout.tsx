import React, { useEffect, useMemo, useState, PropsWithChildren, useCallback, useRef } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth as useAuthRedux } from '@/hooks/useAuth'
import { useAuth as useAuthContext } from '@/contexts/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/use-toast'
import {
  Home,
  User,
  Briefcase,
  Plus,
  Settings,
  LogOut,
  FolderOpen,
  List,
  GitBranch,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  ArrowLeftRight,
} from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, useAppDispatch } from '@/store'
import { selectSelectedClient, selectClients, selectSelectedClientName, switchToClient, selectClientContext, selectSwitchingToClient } from '@/store/slices/clientsSlice'
import { refreshAccessToken, selectTokens } from '@/store/slices/authSlice'
import { selectUser as selectProfileUser, selectUserProfiles, selectCurrentProfile, switchToProfile } from '@/store/slices/profileSlice'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import UserMenu from '@/components/UserMenu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
// import { useReduxData } from '@/hooks/useReduxData'
import type { Client } from '@/store/types'

type DashboardLayoutProps = PropsWithChildren<{
  activeItem?: string
  navMode?: 'full' | 'onboarding'
  pageTitle?: string
  pageSubtitle?: string
}>

export default function DashboardLayout({ children, activeItem, navMode = 'full', pageTitle, pageSubtitle }: DashboardLayoutProps) {
  // Persist sidebar collapsed state across reloads (localStorage, durable)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem('sck.sidebarCollapsed') === '1'
    } catch {
      return false
    }
  })
  const { toast } = useToast()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  // Use both auth systems: Redux (tokens) + Context (session flag/user)
  const { logout: logoutRedux } = useAuthRedux()
  const { logout: logoutCtx } = useAuthContext()
  const { theme, isDark, toggleTheme } = useTheme()
  const profileUser = useSelector(selectProfileUser as any) as any
  const profiles = useSelector(selectUserProfiles as any) as any[]
  const currentProfile = useSelector(selectCurrentProfile as any) as string | null
  const dispatch = useDispatch()

  const avatarUrl = profileUser?.avatar_url || ''
  const loginName = profileUser?.email || profileUser?.identity?.email || profileUser?.identity?.username || profileUser?.user_id || '—'
  const displayName = profileUser?.display_name || [profileUser?.first_name, profileUser?.last_name].filter(Boolean).join(' ') || ''
  const initials = (displayName || loginName || 'U')
    .split(' ')
    .map((s: string) => s?.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Redux-backed client data (source of truth)
  const clients = useSelector((s: RootState) => selectClients(s)) as Client[]
  const selectedClient = useSelector((s: RootState) => selectSelectedClient(s)) as string | null
  const currentClientName = useSelector((s: RootState) => selectSelectedClientName(s)) as string
  const switchingToClient = useSelector((s: RootState) => selectSwitchingToClient(s)) as string | null
  // const { selectClient } = useReduxData()
  const dispatchTyped = useAppDispatch()
  // Access tokens reside only in Redux (not sessionStorage). Use them for tenant (cnm) detection.
  const tokens = useSelector((s: RootState) => selectTokens(s) as any)

  // Client bootstrap moved to ClientsBootstrap at app root

  // Tenant alignment logic: ensure access token scope (cnm) matches selected client.
  // Avoid unnecessary /auth/v1/token calls when simply navigating between pages.
  useEffect(() => {
    // Avoid duplicate switching/notifications while an explicit switch is in-flight
    if (switchingToClient) return;
    // Decode current Redux access token (if any)
    let tokenClient: string | null = null
    try {
      const access = tokens?.access_token
      if (access && access.split('.').length === 3) {
        const payload = JSON.parse(atob(access.split('.')[1]))
        tokenClient = (payload as any)?.cnm || null
      }
    } catch { /* ignore decode errors */ }

    // 1. If both selectedClient and token client exist and differ, perform a scoped switch (refresh with state)
    if (selectedClient && tokenClient && selectedClient !== tokenClient) {
      ;(async () => {
        try {
          await (dispatchTyped(switchToClient(selectedClient) as any) as any).unwrap()
        } catch (e: any) {
          const msg = typeof e === 'string' ? e : 'You do not have permission to access this client.'
          toast({
            variant: 'destructive',
            title: 'Access to client is unauthorized',
            description: msg,
          })
        }
      })()
      return
    }

    // 2. If user selected a client but we have no access token yet (fresh tab / reload), attempt a refresh specifying desired client.
    // Guard: only if refresh_token exists (sessionStorage) to avoid spurious call.
    const haveAccess = Boolean(tokens?.access_token)
    const haveRefresh = (() => { try { return Boolean(sessionStorage.getItem('refresh_token')) } catch { return false } })()
    if (selectedClient && !haveAccess && haveRefresh) {
      dispatchTyped(refreshAccessToken(`client=${selectedClient}`) as any)
    }
    // Otherwise do nothing – navigation alone should not trigger refresh.
  }, [dispatchTyped, selectedClient, tokens?.access_token, toast, switchingToClient])

  // Inject fallback Core client if list empty or failed
  const effectiveClients = useMemo<Client[]>(() => {
    if (clients && clients.length > 0) return clients
    return [
      {
        client: 'core',
        client_name: 'Core',
        client_status: 'active',
        client_description: 'Core default context',
        organization_name: 'Core',
        created_at: undefined as any,
      } as Client,
    ]
  }, [clients])

  // Client selection handled by ClientsBootstrap


  // Navigation definitions
  const fullNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Zones', href: '/zones', icon: GitBranch },
    { name: 'Portfolios', href: '/portfolios', icon: Briefcase },
    { name: 'Applications', href: '/applications', icon: FolderOpen },
    { name: 'Deployments', href: '/deployments', icon: GitBranch },
    { name: 'Documentation', href: '/docs', icon: List },
  ]
  const onboardingNavigation = [
    { name: 'Onboarding', href: '/dashboard', icon: Home },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Documentation', href: '/docs', icon: List },
  ]
  const navigation = navMode === 'onboarding' ? onboardingNavigation : fullNavigation

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/')

  const handleLogout = async () => {
    try {
      // Clear session flags immediately for guards
      try {
        localStorage.removeItem('sck_logged_in')
        sessionStorage.removeItem('sck_logged_in')
      } catch {
        // ignore storage cleanup errors
      }
      // Invoke both logout mechanisms
      await Promise.resolve(logoutRedux())
      await Promise.resolve(logoutCtx())
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  // Content to render: children if provided, else nested routes via Outlet
  const content = children ?? <Outlet />

  // Mobile detection via CSS breakpoint (no SSR issue since only client matters)
  const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
  useEffect(() => {
    const onResize = () => {
      const m = window.innerWidth < 768
      setIsMobile(m)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    if (mobileOpen) setMobileOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Esc to close mobile menu
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const toggleMobile = useCallback(() => setMobileOpen(o => !o), [])

  return (
    <SidebarProvider
      open={!sidebarCollapsed}
      onOpenChange={(open) => {
        const collapsed = !open
        setSidebarCollapsed(collapsed)
        try {
          localStorage.setItem('sck.sidebarCollapsed', collapsed ? '1' : '0')
        } catch {
          // ignore persistence errors
        }
      }}
    >
      <div className="min-h-screen w-full flex flex-col">
        {/* Header */}
        <header className="bg-dashboard-header shadow-soft border-b border-border w-full sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              {/* Hamburger on mobile */}
              {isMobile && (
                <button
                  aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  onClick={toggleMobile}
                  className="inline-flex md:hidden items-center justify-center h-9 w-9 rounded-md border border-border bg-background hover:bg-muted transition-colors"
                >
                  <span className="sr-only">Menu</span>
                  <div className="flex flex-col gap-[3px]">
                    <span className={`h-[2px] w-5 bg-foreground transition-transform ${mobileOpen ? 'rotate-45 translate-y-[5px]' : ''}`}></span>
                    <span className={`h-[2px] w-5 bg-foreground transition-opacity ${mobileOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                    <span className={`h-[2px] w-5 bg-foreground transition-transform ${mobileOpen ? '-rotate-45 -translate-y-[5px]' : ''}`}></span>
                  </div>
                </button>
              )}
              <div className="flex items-center gap-3">
                {!isMobile && (
                  <button
                    onClick={() => setSidebarCollapsed(c => {
                      const next = !c
                      try {
                        localStorage.setItem('sck.sidebarCollapsed', next ? '1' : '0')
                      } catch {
                        // ignore persistence errors
                      }
                      return next
                    })}
                    aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted transition-colors"
                  >
                    {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                  </button>
                )}
                <div>
                  <h1 className="sck-page-title">
                    {pageTitle ?? (isMobile ? 'Core Automation' : 'Core Automation Portal')}
                  </h1>
                  {pageSubtitle && (
                    <div className="sck-page-subtitle">{pageSubtitle}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Unified Client Selector (always visible; fallback Core) */}
              <div className="flex items-center">
                <Select
                  value={selectedClient ?? ''}
                  onValueChange={async (value) => {
                    const target = value || null
                    // No-op if selecting current
                    if (!target || target === selectedClient) {
                      if (!target) dispatchTyped(selectClientContext(null))
                      return
                    }
                    try {
                      // Attempt scoped token switch first; selection and clears handled inside thunk
                      await (dispatchTyped(switchToClient(target) as any) as any).unwrap()
                      // Proactively refresh the access token for the new client scope
                      dispatchTyped(refreshAccessToken(`client=${target}`) as any)
                    } catch (e: any) {
                      const msg = typeof e === 'string' ? e : 'You do not have permission to access this client.'
                      toast({ variant: 'destructive', title: 'Access to client is unauthorized', description: msg })
                      // Keep previous selection (controlled value stems from Redux)
                    }
                  }}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select client..." >{currentClientName}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveClients.map((client) => (
                      <SelectItem key={client.client} value={client.client}>
                        {client.client_name || client.client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Profile/avatar dropdown */}
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Content area with sidebar */}
        <div className="flex flex-1">
          {/* Desktop sidebar */}
          {/* Desktop sidebar always visible on large screens */}
          {!isMobile && (
            <AppSidebar
              navigation={navigation}
              isActive={isActive}
              handleLogout={handleLogout}
              collapsed={sidebarCollapsed}
            />
          )}

          {/* Mobile overlay drawer */}
          {isMobile && mobileOpen && (
            <div className="fixed inset-0 z-50 flex">
              <div
                className="absolute inset-0 bg-scrim backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
                aria-hidden="true"
              />
              <div className="relative h-full w-72 max-w-[80%] bg-dashboard-sidebar border-r border-border shadow-xl animate-in slide-in-from-left duration-200 flex flex-col">
                <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                  <span className="font-semibold text-sm">Navigation</span>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted"
                    aria-label="Close menu"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <AppSidebar
                    navigation={navigation}
                    isActive={isActive}
                    handleLogout={handleLogout}
                    collapsed={false}
                  />
                </div>
              </div>
            </div>
          )}

          <main className="flex-1 p-6">{content}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}

interface AppSidebarProps {
  navigation: Array<{
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
  }>
  isActive: (href: string) => boolean
  handleLogout: () => void
  collapsed: boolean
}

function AppSidebar({ navigation, isActive, handleLogout, collapsed }: AppSidebarProps) {
  return (
    <Sidebar
      className={`border-r bg-dashboard-sidebar transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      collapsible="none"
    >
      <SidebarContent>
        <SidebarGroup className="pt-4">
          {!collapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      className={collapsed ? 'justify-center' : ''}
                      title={collapsed ? item.name : undefined}
                    >
                      <Link to={item.href} className="flex items-center gap-3">
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span>{item.name}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer actions */}
        <div className="mt-auto p-4 border-t border-border">
          <SidebarMenu>
             <SidebarMenuItem>
               <SidebarMenuButton
                 asChild
                 className={collapsed ? 'justify-center' : ''}
                 title={collapsed ? 'Logout' : undefined}
               >
                 <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left">
                   <LogOut className="h-5 w-5 flex-shrink-0" />
                   {!collapsed && <span>Logout</span>}
                 </button>
               </SidebarMenuButton>
             </SidebarMenuItem>
           </SidebarMenu>
         </div>
      </SidebarContent>
    </Sidebar>
  )
}