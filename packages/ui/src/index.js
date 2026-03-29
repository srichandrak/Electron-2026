// UI Package - Contexts
export { AuthProvider, useAuth } from './contexts/AuthContext'
export { ThemeProvider, useTheme } from './contexts/ThemeContext'
export { NotificationProvider, useNotification } from './contexts/NotificationContext'
export { FileProvider, useFiles } from './contexts/FileContext'
export { OBCRAGProvider, useOBCRAG } from './contexts/OBCRAGContext'

// UI Package - Components
export { Notification } from './components/Notification'

// Note: Additional components (TitleBar, ActivityBar, Sidebars, etc.)
// will be added during full migration. For now, these remain in apps/desktop.
