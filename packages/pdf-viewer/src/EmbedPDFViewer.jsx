import React, { useRef, useEffect, useState } from 'react'
import { EmbedPDF } from '@embedpdf/core/react'
import { FilePicker } from '@embedpdf/plugin-loader/react'
import { Viewport, useViewportCapability } from '@embedpdf/plugin-viewport/react'
import { GlobalPointerProvider } from '@embedpdf/plugin-interaction-manager/react'
import { Scroller } from '@embedpdf/plugin-scroll/react'
import { TilingLayer } from '@embedpdf/plugin-tiling/react'
import { Rotate } from '@embedpdf/plugin-rotate/react'
import { FullscreenProvider } from '@embedpdf/plugin-fullscreen/react'
import { Download } from '@embedpdf/plugin-export/react'
import { RenderLayer } from '@embedpdf/plugin-render/react'
import { useZoom } from '@embedpdf/plugin-zoom/react'
import { usePan } from '@embedpdf/plugin-pan/react'

// Import our custom hook and components
import { useEmbedPDFEngine } from './hooks/useEmbedPDFEngine'
import { EmbedPDFToolbar } from './components/EmbedPDFToolbar'
import { LoadingSpinner } from './ui/LoadingSpinner'
import { ErrorMessage } from './ui/ErrorMessage'
import { PDFErrorBoundary } from './PDFErrorBoundary'

// Component to handle zoom-to-mouse functionality
// This wraps the content and captures wheel events to implement zoom-to-cursor
const ZoomToMouseHandler = ({ children }) => {
  const containerRef = useRef(null)
  const { provides: zoomProvides } = useZoom() || {}

  useEffect(() => {
    const container = containerRef.current
    if (!container || !zoomProvides) return

    const handleWheel = (e) => {
      // Only handle wheel events with Ctrl/Cmd key (zoom)
      if (!e.ctrlKey && !e.metaKey) return

      e.preventDefault()
      e.stopPropagation()

      // Find the viewport element (the actual scrollable container)
      const viewportElement = container.querySelector('[data-viewport]') || container.firstChild
      if (!viewportElement) return

      // Get viewport dimensions and scroll position
      const viewportRect = viewportElement.getBoundingClientRect()
      const scrollLeft = viewportElement.scrollLeft || 0
      const scrollTop = viewportElement.scrollTop || 0

      // Calculate mouse position in viewport coordinates
      // vx, vy are relative to the scrollable content (0,0 = top-left of content)
      const vx = e.clientX - viewportRect.left + scrollLeft
      const vy = e.clientY - viewportRect.top + scrollTop

      // Determine zoom delta (negative deltaY = zoom in)
      const delta = -e.deltaY
      const zoomDelta = delta > 0 ? 0.1 : -0.1

      // Request zoom with center point
      // The zoom plugin will automatically adjust scroll position to keep the point under the mouse
      zoomProvides.requestZoomBy(zoomDelta, { vx, vy })
    }

    // Capture wheel events in capture phase to intercept before viewport handles them
    container.addEventListener('wheel', handleWheel, { passive: false, capture: true })
    return () => container.removeEventListener('wheel', handleWheel, { capture: true })
  }, [zoomProvides])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {children}
    </div>
  )
}

// Component to intercept mouse events and filter for left-click only panning
// This ensures that panning only works with left-click, not right-click
const LeftClickPanHandler = ({ children }) => {
  const containerRef = useRef(null)
  const { isPanning } = usePan() || {}
  const viewportHook = useViewportCapability()
  const viewport = viewportHook?.provides
  const dragStateRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !viewport) return

    const handleMouseDown = (e) => {
      // Only handle left-click (button 0) when pan mode is active
      if (e.button !== 0 || !isPanning) return

      // Find the viewport element
      const viewportElement = container.querySelector('[data-viewport]') || container.firstChild
      if (!viewportElement) return

      // Store drag state
      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startScrollLeft: viewportElement.scrollLeft || 0,
        startScrollTop: viewportElement.scrollTop || 0,
      }

      // Prevent default to avoid text selection
      e.preventDefault()
      e.stopPropagation()

      // Update cursor
      container.style.cursor = 'grabbing'
    }

    const handleMouseMove = (e) => {
      if (!dragStateRef.current) return

      const dx = e.clientX - dragStateRef.current.startX
      const dy = e.clientY - dragStateRef.current.startY

      // Update scroll position via viewport
      viewport.scrollTo({
        x: dragStateRef.current.startScrollLeft - dx,
        y: dragStateRef.current.startScrollTop - dy,
      })

      e.preventDefault()
      e.stopPropagation()
    }

    const handleMouseUp = (e) => {
      if (!dragStateRef.current) return

      dragStateRef.current = null
      container.style.cursor = isPanning ? 'grab' : ''

      e.preventDefault()
      e.stopPropagation()
    }

    const handleMouseLeave = () => {
      if (!dragStateRef.current) return

      dragStateRef.current = null
      container.style.cursor = isPanning ? 'grab' : ''
    }

    // Add event listeners in capture phase to intercept before EmbedPDF handlers
    container.addEventListener('mousedown', handleMouseDown, { capture: true })
    container.addEventListener('mousemove', handleMouseMove, { capture: true })
    container.addEventListener('mouseup', handleMouseUp, { capture: true })
    container.addEventListener('mouseleave', handleMouseLeave, { capture: true })

    // Update cursor based on pan state
    container.style.cursor = isPanning ? 'grab' : ''

    return () => {
      container.removeEventListener('mousedown', handleMouseDown, { capture: true })
      container.removeEventListener('mousemove', handleMouseMove, { capture: true })
      container.removeEventListener('mouseup', handleMouseUp, { capture: true })
      container.removeEventListener('mouseleave', handleMouseLeave, { capture: true })
      container.style.cursor = ''
    }
  }, [viewport, isPanning])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {children}
    </div>
  )
}

// Component to handle smart centering of PDF content
// Centers content when it fits in viewport, allows free scrolling when larger
// With support for beyond-boundary panning via padding
const SmartCenteringWrapper = ({ children }) => {
  const containerRef = useRef(null)
  const { state: zoomState } = useZoom() || {}
  const viewportHook = useViewportCapability()
  const viewport = viewportHook?.provides

  useEffect(() => {
    const container = containerRef.current
    if (!container || !viewport) return

    const scrollToCenter = () => {
      // Find the viewport element
      const viewportElement = container.querySelector('[data-viewport]') || container.parentElement?.querySelector('[data-viewport]')
      if (!viewportElement) return

      // Find the scroller container (the div with padding that we added via CSS)
      const scrollerContainer = container.querySelector('div[style*="position: relative"]')
      if (!scrollerContainer) return

      // Get computed padding from the scroller container
      const computedStyle = window.getComputedStyle(scrollerContainer)
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0

      // Calculate actual content dimensions (excluding padding)
      const contentWidth = scrollerContainer.offsetWidth - (paddingLeft * 2)
      const contentHeight = scrollerContainer.offsetHeight - (paddingTop * 2)
      const viewportWidth = viewportElement.clientWidth
      const viewportHeight = viewportElement.clientHeight

      // Center the content by scrolling to the padding offset
      // minus half the difference between viewport and content
      const scrollLeft = paddingLeft - (viewportWidth - contentWidth) / 2
      const scrollTop = paddingTop - (viewportHeight - contentHeight) / 2

      // Scroll to center position
      viewport.scrollTo({
        x: Math.max(0, scrollLeft),
        y: Math.max(0, scrollTop),
        behavior: 'auto'
      })
    }

    const updateCentering = () => {
      // Find the scroller container (the div with the margin: 0 auto that we're overriding)
      const scrollerContainer = container.querySelector('div[style*="position: relative"]')
      if (!scrollerContainer) return

      // Find the viewport element
      const viewportElement = container.querySelector('[data-viewport]') || container.parentElement?.querySelector('[data-viewport]')
      if (!viewportElement) return

      // Get computed padding
      const computedStyle = window.getComputedStyle(scrollerContainer)
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0

      // Calculate dimensions excluding padding
      const viewportWidth = viewportElement.clientWidth
      const viewportHeight = viewportElement.clientHeight
      const contentWidth = scrollerContainer.offsetWidth - (paddingLeft * 2)
      const contentHeight = scrollerContainer.offsetHeight - (paddingTop * 2)

      // Calculate centering offsets (only for visual centering when content is smaller)
      const horizontalOffset = contentWidth < viewportWidth ? (viewportWidth - contentWidth) / 2 : 0
      const verticalOffset = contentHeight < viewportHeight ? (viewportHeight - contentHeight) / 2 : 0

      // Apply transform for centering when content fits
      if (horizontalOffset > 0 || verticalOffset > 0) {
        scrollerContainer.style.transform = `translate(${horizontalOffset}px, ${verticalOffset}px)`
        scrollerContainer.style.transition = 'transform 0.2s ease-out'
      } else {
        scrollerContainer.style.transform = ''
        scrollerContainer.style.transition = ''
      }
    }

    // Center scroll position on mount and when zoom changes
    scrollToCenter()

    // Update visual centering
    updateCentering()

    // Use ResizeObserver to detect when scroller size changes
    const resizeObserver = new ResizeObserver(() => {
      scrollToCenter()
      updateCentering()
    })
    const scrollerContainer = container.querySelector('div[style*="position: relative"]')
    if (scrollerContainer) {
      resizeObserver.observe(scrollerContainer)
    }

    // Also listen to viewport resize
    const viewportElement = container.querySelector('[data-viewport]') || container.parentElement?.querySelector('[data-viewport]')
    if (viewportElement) {
      resizeObserver.observe(viewportElement)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [viewport, zoomState?.currentZoomLevel])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {children}
    </div>
  )
}

// Main EmbedPDF viewer component using the new architecture
export const EmbedPDFViewer = ({ file }) => {
  const { engine, plugins, isLoading, error, hasFile } = useEmbedPDFEngine(file)

  // Show loading state while engine initializes
  if (isLoading) {
    return <LoadingSpinner progress={0} filename={file?.filename || 'PDF'} />
  }

  // Show error state if engine failed to load
  if (error) {
    return <ErrorMessage error={`Failed to initialize PDF engine: ${error.message}`} />
  }

  // Show message if no file is provided
  if (!hasFile) {
    return (
      <div className="h-full flex flex-col bg-gray-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>No PDF file selected</p>
            <p className="text-sm mt-2">Upload a PDF file to get started</p>
          </div>
        </div>
      </div>
    )
  }

  // Render the EmbedPDF viewer with all plugins
  return (
    <div className="h-full flex flex-col min-h-0 bg-gray-100">
      <EmbedPDF engine={engine} plugins={plugins}>
        {({ pluginsReady }) => (
          <FullscreenProvider>
            <div className="flex flex-col h-full min-h-0">
              {/* Toolbar - only render when plugins are ready */}
              {pluginsReady ? (
                <EmbedPDFToolbar file={file} />
              ) : (
                <div className="pdf-toolbar-nowrap bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                  <div className="flex items-center justify-center py-2 text-[var(--text-secondary)]">
                    <span className="text-sm">Loading PDF controls...</span>
                  </div>
                </div>
              )}

              {/* Main viewer area */}
              <div className="flex-1 min-h-0 relative">
                <ZoomToMouseHandler>
                  <LeftClickPanHandler>
                    <SmartCenteringWrapper>
                      <GlobalPointerProvider>
                        <Viewport
                          style={{
                            backgroundColor: '#f1f3f5',
                            width: '100%',
                            height: '100%',
                          }}
                        >
                    {pluginsReady ? (
                      <PDFErrorBoundary fallback={<LoadingSpinner progress={0} filename={file?.filename || 'PDF'} />}>
                        <Scroller
                          renderPage={({ pageIndex, width, height, scale, document }) => (
                          <Rotate pageSize={{ width, height }}>
                            <div
                              key={document?.id}
                              style={{
                                width,
                                height,
                                position: 'relative',
                                backgroundColor: 'white',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                margin: '10px 0',
                              }}
                            >
                              {/* RenderLayer handles the actual PDF page rendering */}
                              <RenderLayer pageIndex={pageIndex} scale={scale} />
                              {/* TilingLayer for better high-zoom performance - wrapped in error boundary */}
                              <PDFErrorBoundary fallback={null}>
                                <TilingLayer pageIndex={pageIndex} scale={scale} />
                              </PDFErrorBoundary>
                            </div>
                          </Rotate>
                          )}
                        />
                      </PDFErrorBoundary>
                    ) : (
                      <LoadingSpinner progress={0} filename={file?.filename || 'PDF'} />
                    )}
                    </Viewport>
                  </GlobalPointerProvider>
                    </SmartCenteringWrapper>
                  </LeftClickPanHandler>
                </ZoomToMouseHandler>
              </div>
            </div>
            {/* Export and File picker components */}
            <Download />
            <FilePicker />
          </FullscreenProvider>
        )}
      </EmbedPDF>
    </div>
  )
}
