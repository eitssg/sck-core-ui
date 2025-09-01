import { useAppSelector } from '@/store'
import { selectUser, selectUserTheme } from '@/store/slices/profileSlice'
import { ThemeProvider } from './ThemeProvider'

interface ThemeManagerProps {
  children: React.ReactNode
}

export function ThemeManager({ children }: ThemeManagerProps) {
  const user = useAppSelector(selectUser)
  const userTheme = useAppSelector(selectUserTheme)

  // Determine theme: user theme if logged in, system if not
  const currentTheme = user ? userTheme : 'system'

  return (
    <ThemeProvider theme={currentTheme}>
      {children}
    </ThemeProvider>
  )
}
