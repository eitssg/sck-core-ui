import React, { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from '@/store'
import { useAuth as useAuthRedux } from '@/hooks/useAuth'
import { useAuth as useAuthContext } from '@/contexts/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { LogOut, ArrowLeftRight } from 'lucide-react'
import { selectUser as selectProfileUser, selectUserProfiles, selectCurrentProfile, switchToProfile } from '@/store/slices/profileSlice'

export default function UserMenu() {
  const { logout: logoutRedux } = useAuthRedux()
  const { logout: logoutCtx } = useAuthContext()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  const profileUser = useSelector(selectProfileUser as any) as any
  const profiles = useSelector(selectUserProfiles as any) as any[]
  const currentProfile = useSelector(selectCurrentProfile as any) as string | null

  const avatarUrl = String(profileUser?.avatar_url || '')
  const displayName = profileUser?.display_name || [profileUser?.first_name, profileUser?.last_name].filter(Boolean).join(' ') || ''
  const loginName = profileUser?.email || profileUser?.identity?.email || profileUser?.identity?.username || profileUser?.user_id || '—'
  const initials = useMemo(() => (displayName || loginName || 'U')
    .split(' ')
    .map((s: string) => s?.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase(), [displayName, loginName])

  const handleLogout = async () => {
    try {
      try {
        localStorage.removeItem('sck_logged_in')
        sessionStorage.removeItem('sck_logged_in')
      } catch {
        // ignore storage cleanup errors
      }
      await Promise.resolve(logoutRedux())
      await Promise.resolve(logoutCtx())
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full border hover:bg-accent transition-colors p-1 pl-1.5 pr-2"
          aria-label="User menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={displayName || loginName || 'User'} />
            <AvatarFallback>{initials || 'U'}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl} alt={displayName || loginName || 'User'} />
              <AvatarFallback>{initials || 'U'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold truncate">{displayName || 'User'}</span>
                  <div className="text-xs text-muted-foreground truncate">{loginName}</div>
                </div>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="p-0 h-auto self-center data-[state=open]:bg-transparent [&>svg:last-child]:hidden inline-flex items-center justify-center">
                    <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={currentProfile ?? (profiles?.[0]?.profile_name || 'default')}
                      onValueChange={(value) => dispatch(switchToProfile({ profileName: value } as any))}
                    >
                      {(profiles && profiles.length > 0 ? profiles : [{ profile_name: 'default' }]).map((p: any) => (
                        <DropdownMenuRadioItem key={p.profile_name} value={p.profile_name}>
                          {p.profile_name}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/dashboard">Dashboard</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile">Profiles</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/clients">Clients</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Dark mode</span>
          <Switch checked={isDark} onCheckedChange={() => toggleTheme()} aria-label="Toggle dark mode" />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="group data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-600 dark:data-[highlighted]:bg-green-500/10 dark:data-[highlighted]:text-green-400">
          <LogOut className="mr-2 h-4 w-4 text-muted-foreground dark:text-foreground group-data-[highlighted]:text-red-600 dark:group-data-[highlighted]:text-green-400" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
