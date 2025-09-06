import { createContext } from 'react'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  theme?: string
  role?: string
}

export interface AuthContextType {
  user: User | null
  login: (token: string) => Promise<void>
  logout: () => void
  loading: boolean
  error: string | null
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
