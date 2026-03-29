import { useMemo } from 'react'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import { createPluginRegistration } from '@embedpdf/core'
import { LoaderPluginPackage } from '@embedpdf/plugin-loader'
import { ViewportPluginPackage } from '@embedpdf/plugin-viewport'
import { InteractionManagerPluginPackage } from '@embedpdf/plugin-interaction-manager'
import { PanPluginPackage } from '@embedpdf/plugin-pan/react'
import { ScrollPluginPackage, ScrollStrategy } from '@embedpdf/plugin-scroll'
import { RenderPluginPackage } from '@embedpdf/plugin-render'
import { ZoomPluginPackage, ZoomMode } from '@embedpdf/plugin-zoom'
import { TilingPluginPackage } from '@embedpdf/plugin-tiling'
import { RotatePluginPackage } from '@embedpdf/plugin-rotate'
import { SpreadPluginPackage } from '@embedpdf/plugin-spread'
import { FullscreenPluginPackage } from '@embedpdf/plugin-fullscreen'
import { ExportPluginPackage } from '@embedpdf/plugin-export'

// Custom hook to manage EmbedPDF engine and plugin configuration
export const useEmbedPDFEngine = (file) => {
  // Initialize the PDFium engine
  const { engine, isLoading: engineLoading, error: engineError } = usePdfiumEngine()

  // Essential plugins in proper initialization order - memoized to prevent recreation
  const plugins = useMemo(() => [
    // Core plugins - must be first
    createPluginRegistration(LoaderPluginPackage, {
      loadingOptions: {
        type: 'buffer',
        pdfFile: {
          id: file?.id || 'pdf-document',
          content: file?.content, // ArrayBuffer from FileContext
        },
      },
    }),
    createPluginRegistration(ViewportPluginPackage),
    createPluginRegistration(ScrollPluginPackage, {
      strategy: ScrollStrategy.Vertical,
      initialPage: 1,
      pageGap: 10,
      bufferSize: 2,
    }),
    createPluginRegistration(RenderPluginPackage),

    // Enhancement plugins - order dependent on core plugins
    createPluginRegistration(InteractionManagerPluginPackage),
    createPluginRegistration(ZoomPluginPackage, {
      defaultZoomLevel: ZoomMode.FitPage,
    }),
    createPluginRegistration(PanPluginPackage, {
      defaultMode: 'never',    // Enable pan by default - drag to move the PDF
    }),

    // Additional feature plugins
    createPluginRegistration(TilingPluginPackage, {
      tileSize: 768,
      overlapPx: 2.5,
      extraRings: 0,
    }),
    createPluginRegistration(RotatePluginPackage),
    createPluginRegistration(SpreadPluginPackage),
    createPluginRegistration(FullscreenPluginPackage),
    createPluginRegistration(ExportPluginPackage),
  ], [file?.id, file?.content])

  return {
    engine,
    plugins,
    isLoading: engineLoading,
    error: engineError,
    hasFile: !!file?.content,
  }
}
