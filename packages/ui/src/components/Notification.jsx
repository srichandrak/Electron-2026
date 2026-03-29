import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

export const Notification = ({ id, message, type = 'info', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 100)

    const hideTimer = type === 'error'
      ? null
      : setTimeout(() => {
          setIsVisible(false)
          setTimeout(onClose, 300)
        }, duration)

    return () => {
      clearTimeout(showTimer)
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [duration, onClose, type])

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={16} />
      case 'error': return <XCircle size={16} />
      case 'warning': return <AlertTriangle size={16} />
      default: return <Info size={16} />
    }
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return { borderLeft: '4px solid #10b981', iconColor: '#10b981' }
      case 'error':
        return { borderLeft: '4px solid #ef4444', iconColor: '#ef4444' }
      case 'warning':
        return { borderLeft: '4px solid #f59e0b', iconColor: '#f59e0b' }
      default:
        return { borderLeft: '4px solid #3b82f6', iconColor: '#3b82f6' }
    }
  }

  const typeStyles = getTypeStyles()

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--bg-sidebar)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        boxShadow: '0 4px 16px var(--shadow)',
        fontSize: '14px',
        maxWidth: '400px',
        minWidth: '300px',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...typeStyles
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px'
      }}>
        <div style={{ color: typeStyles.iconColor, flexShrink: 0, marginTop: '2px' }}>
          {getIcon()}
        </div>

        <div style={{ flex: 1, lineHeight: '1.4' }}>
          {message}
        </div>

        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            flexShrink: 0
          }}
        >
          <X size={12} />
        </button>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'var(--border)',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          background: typeStyles.iconColor,
          animation: `shrink ${duration}ms linear`,
          transformOrigin: 'left'
        }} />
      </div>

      <style>{`
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  )
}
