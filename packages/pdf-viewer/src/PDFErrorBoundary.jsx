import React from 'react'
import { ErrorMessage } from './ui/ErrorMessage'

class PDFErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error('PDF Error Boundary caught an error:', error, errorInfo)

    // Check if this is a specific error we're trying to handle
    const isViewportError = error.message && error.message.includes('viewportMetrics')
    const isSrcScaleError = error.message && error.message.includes('srcScale')

    if (isViewportError || isSrcScaleError) {
      // For initialization errors, try to recover after a short delay
      setTimeout(() => {
        this.setState({ hasError: false, error: null, errorInfo: null })
      }, 200)
    } else {
      // For other errors, store them in state
      this.setState({
        error,
        errorInfo
      })
    }
  }

  render() {
    if (this.state.hasError) {
      // Check if it's an error that we're trying to recover from
      const isViewportError = this.state.error?.message?.includes('viewportMetrics')
      const isSrcScaleError = this.state.error?.message?.includes('srcScale')

      if (isViewportError || isSrcScaleError) {
        // Show a brief loading state for viewport errors while recovering
        return (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="text-center text-gray-500">
              <p>Initializing PDF viewer...</p>
            </div>
          </div>
        )
      }

      // For other errors, show a proper error message
      return (
        <ErrorMessage
          error={`PDF Error: ${this.state.error?.message || 'Unknown error occurred'}`}
        />
      )
    }

    return this.props.children
  }
}

export { PDFErrorBoundary }
