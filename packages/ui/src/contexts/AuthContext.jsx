import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({
    username: 'JD',
    displayName: 'John Doe',
    role: 'Professional',
    isAuthenticated: true
  })
  const [isConnected, setIsConnected] = useState(true)

  const logout = () => {
    setUser(null)
    // In a real app, this would redirect to login
  }

  return (
    <AuthContext.Provider value={{
      user,
      isConnected,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}
