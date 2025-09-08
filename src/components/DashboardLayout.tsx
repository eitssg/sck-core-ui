import React, { useEffect, useMemo, useState, PropsWithChildren } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth as useAuthRedux } from '@/hooks/useAuth'
import { useAuth as useAuthContext } from '@/contexts/useAuth'
import { useTheme } from '@/hooks/useTheme'
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
  Cloud,
} from 'lucide-react'
import {
  ArrowLeftRight,
} from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, useAppDispatch } from '@/store'
import { selectSelectedClient, selectClients, selectSelectedClientName, setSelectedClient, fetchClients } from '@/store/slices/clientsSlice'
import { selectUser as selectProfileUser, selectUserProfiles, selectCurrentProfile, switchToProfile, fetchUserProfile } from '@/store/slices/profileSlice'
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
}>

export default function DashboardLayout({ children, activeItem }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
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
  // const { selectClient } = useReduxData()
  const dispatchTyped = useAppDispatch()

  // Ensure client list is available after login (cached & TTL guarded by thunk)
  useEffect(() => {
    dispatchTyped(fetchClients({ limit: 100 }))
  }, [dispatchTyped])

  // Ensure profile is loaded after reloads so header avatar/menu has data
  useEffect(() => {
    if (!profileUser) {
      dispatchTyped(fetchUserProfile({}))
    }
  }, [dispatchTyped, profileUser])

  // Auto-select first client if none selected and we have data
  useEffect(() => {
    if (!selectedClient && clients.length > 0) {
      dispatchTyped(setSelectedClient(clients[0].client))
    }
  }, [selectedClient, clients, dispatchTyped])

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Zones', href: '/zones', icon: GitBranch },
    { name: 'Portfolios', href: '/portfolios', icon: Briefcase },
    { name: 'Applications', href: '/applications', icon: FolderOpen },
  { name: 'Deployments', href: '/deployments', icon: GitBranch },
  { name: 'Documentation', href: '/docs', icon: List },
  ]

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

  return (
    <SidebarProvider open={!sidebarCollapsed} onOpenChange={(open) => setSidebarCollapsed(!open)}>
      <div className="min-h-screen w-full flex flex-col">
        {/* Header */}
        <header className="bg-dashboard-header shadow-soft border-b border-border w-full">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-theme-gradient rounded-lg flex items-center justify-center">
                  <Cloud className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Core Automation Portal</h1>
              </div>
              <SidebarTrigger />
            </div>

            <div className="flex items-center gap-4">
              {/* Client Selection: only show when multiple clients exist */}
              {clients.length > 1 && (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedClient ?? ''}
                    onValueChange={(value) => dispatchTyped(setSelectedClient(value || null))}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Select client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.client} value={client.client}>
                          {client.client_name || client.client}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Current client display */}
              <div className="hidden sm:flex items-center px-2 py-1 rounded-md bg-muted/60 text-muted-foreground max-w-[200px]">
                <span className="truncate" title={currentClientName}>{currentClientName}</span>
              </div>

              {/* Profile/avatar dropdown */}
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Content area with sidebar */}
        <div className="flex flex-1">
          <AppSidebar
            navigation={navigation}
            isActive={isActive}
            handleLogout={handleLogout}
            collapsed={sidebarCollapsed}
          />

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
        <div className="mt-auto p-4 border-t border-border space-y-2">
          <Button
            variant="gradient"
            className={`gap-2 ${collapsed ? 'px-2' : 'w-full'}`}
            size={collapsed ? 'icon' : 'default'}
            title={collapsed ? 'Quick Create' : undefined}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && 'Quick Create'}
          </Button>

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