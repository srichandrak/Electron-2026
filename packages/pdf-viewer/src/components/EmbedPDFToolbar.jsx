import React from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, RotateCw, RotateCcw, RefreshCw, ArrowUp, ArrowDown, Mouse, HandIcon } from 'lucide-react'
import { useZoom } from '@embedpdf/plugin-zoom/react'
import { useScroll } from '@embedpdf/plugin-scroll/react'
import { useRotate } from '@embedpdf/plugin-rotate/react'
import { useViewportCapability } from '@embedpdf/plugin-viewport/react'
import { usePan } from '@embedpdf/plugin-pan/react'

// Pan Controls component following EmbedPDF documentation pattern
export const PanControls = () => {
  const { provides: pan, isPanning } = usePan();

  if (!pan) return null;

  const handlePanToggle = () => {
    if (isPanning) {
      pan.disablePan();
    } else {
      pan.enablePan();
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={handlePanToggle}
          title={`Toggle Panning ${isPanning ? '(On)' : '(Off)'} – Hold left click and drag to move the page`}
          className={`p-2 rounded hover:bg-[var(--hover-bg)] transition-colors ${isPanning ? 'bg-blue-500 text-white' : ''}`}
        >
          <HandIcon size={16} />
        </button>
        <span className="text-xs text-[var(--text-secondary)]">Pan</span>
      </div>

      <div className="w-px h-6 bg-[var(--border)]" />
    </>
  );
};

// EmbedPDF-based toolbar using plugin hooks
export const EmbedPDFToolbar = ({ file }) => {
  // Get hook results (hooks must be called unconditionally)
  const zoomHook = useZoom()
  const { provides: scroll, state } = useScroll()
  const viewportHook = useViewportCapability()

  // Extract provides/state with safe access
  const zoomProvides = zoomHook?.provides
  const zoomState = zoomHook?.state
  const viewport = viewportHook?.provides

  const { rotation, provides: rotate } = useRotate() || {};

  // Download functionality (reused from old toolbar)
  const downloadPDF = async () => {
    try {
      let dataToDownload = file.content

      if (!dataToDownload || dataToDownload.byteLength === 0) {
        if (file.originalFile) {
          dataToDownload = await file.originalFile.arrayBuffer()
        } else {
          console.error('No data available for download')
          return
        }
      }

      const blob = new Blob([dataToDownload], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = file.filename
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  // Handle zoom changes
  const handleZoomChange = (value) => {
    if (!zoomProvides) return

    if (value === 'width') {
      // EmbedPDF might have a fit-to-width method
      if (zoomProvides.fitToWidth) {
        zoomProvides.fitToWidth()
      } else {
        // Fallback: set a reasonable zoom level for width fitting
        zoomProvides.requestZoom(1.2)
      }
    } else if (value === 'page') {
      // EmbedPDF might have a fit-to-page method
      if (zoomProvides.fitToPage) {
        zoomProvides.fitToPage()
      } else {
        // Fallback: set zoom to 1.0
        zoomProvides.requestZoom(1.0)
      }
    } else {
      const scale = parseInt(value) / 100
      zoomProvides.requestZoom(scale)
    }
  }

  // Get current zoom level for display
  const currentZoomLevel = zoomState?.currentZoomLevel || 1.0
  const displayZoom = Math.round(currentZoomLevel * 100)

  // Check if navigation capabilities are available
  const hasNavigation = !!scroll
  const currentPage = state?.currentPage ?? 1
  const totalPages = state?.totalPages ?? 0

  // Viewport scrolling functions
  const scrollToTop = () => {
    if (viewport && typeof viewport.scrollTo === 'function') {
      viewport.scrollTo({ x: 0, y: 0, behavior: 'smooth' })
    }
  }

  const scrollToBottom = () => {
    if (viewport && typeof viewport.scrollTo === 'function') {
      viewport.scrollTo({ x: 0, y: 999999, behavior: 'smooth' })
    }
  }

  return (
    <div className="pdf-toolbar-nowrap bg-[var(--bg-secondary)] border-b border-[var(--border)]">
      {/* Page Navigation */}
      {hasNavigation && (
        <>
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll?.scrollToPreviousPage?.()}
              disabled={currentPage <= 1}
              className="p-2 rounded hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous Page (←)"
            >
              <ChevronLeft size={16} />
            </button>

            <input
              type="number"
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value) || 1
                scroll?.scrollToPage?.({ pageNumber: page, behavior: 'smooth' })
              }}
              min="1"
              max={totalPages}
              className="w-16 px-2 py-1 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded text-center"
            />

            <span className="text-sm text-[var(--text-secondary)] px-1">
              / {totalPages}
            </span>

            <button
              onClick={() => scroll?.scrollToNextPage?.()}
              disabled={currentPage >= totalPages}
              className="p-2 rounded hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next Page (→)"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="w-px h-6 bg-[var(--border)]" />
        </>
      )}

      {/* Zoom Controls */}
      {zoomProvides && (
        <>
          <div className="flex items-center gap-1">
            <button
              onClick={() => zoomProvides.zoomOut()}
              className="p-2 rounded hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom Out (EmbedPDF Enhanced)"
            >
              <ZoomOut size={16} />
            </button>

            <select
              value={displayZoom}
              onChange={(e) => handleZoomChange(e.target.value)}
              className="px-2 py-1 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded min-w-[80px]"
            >
              <option value="width">Fit Width</option>
              <option value="page">Fit Page</option>
              <option value="10">10%</option>
              <option value="15">15%</option>
              <option value="20">20%</option>
              <option value="25">25%</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
              <option value="100">100%</option>
              <option value="125">125%</option>
              <option value="150">150%</option>
              <option value="200">200%</option>
              <option value="300">300%</option>
            </select>

            <button
              onClick={() => zoomProvides.zoomIn()}
              className="p-2 rounded hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom In (EmbedPDF Enhanced)"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="w-px h-6 bg-[var(--border)]" />
        </>
      )}

      {/* Pan Controls */}
      <PanControls />

      {/* Viewport Scrolling Controls */}
      {viewport && typeof viewport.scrollTo === 'function' && (
        <>
          <div className="flex items-center gap-1">
            <button
              onClick={scrollToTop}
              className="p-2 rounded hover:bg-[var(--hover-bg)] transition-colors"
              title="Scroll to Top"
            >
              <ArrowUp size={16} />
            </button>

            <button
              onClick={scrollToBottom}
              className="p-2 rounded hover:bg-[var(--hover-bg)] transition-colors"
              title="Scroll to Bottom"
            >
              <ArrowDown size={16} />
            </button>
          </div>

          <div className="w-px h-6 bg-[var(--border)]" />
        </>
      )}

      {/* Rotation Controls */}
        {rotate && (
          <>
            <div className="flex items-center gap-1">
              <button
                onClick={() => rotate.rotateBackward()}
                className="p-2 rounded hover:bg-[var(--hover-bg)] transition-colors"
                title="Rotate Counter-Clockwise (90°)"
              >
                <RotateCcw size={16} />
              </button>

              <button
                onClick={() => rotate.rotateForward()}
                className="p-2 rounded hover:bg-[var(--hover-bg)] transition-colors"
                title="Rotate Clockwise (90°)"
              >
                <RotateCw size={16} />
              </button>

              <span className="text-xs text-[var(--text-secondary)] ml-2 min-w-[30px]">
                {(rotation || 0) * 90}°
              </span>
            </div>

          <div className="w-px h-6 bg-[var(--border)]" />
          </>
        )}

        {/* Additional Controls */}
        {zoomProvides && (
          <button
            onClick={() => zoomProvides.requestZoom(1.0)}
            className="p-2 rounded hover:bg-[var(--hover-bg)] transition-colors"
            title="Reset Zoom"
          >
            <RefreshCw size={16} />
          </button>
        )}

        <button
          onClick={downloadPDF}
          className="p-2 rounded hover:bg-[var(--hover-bg)] transition-colors"
          title="Download PDF"
      >
        <Download size={16} />
      </button>
    </div>
  )
}
