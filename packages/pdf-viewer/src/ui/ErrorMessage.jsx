// Error component for PDF viewer
export const ErrorMessage = ({ error }) => (
  <div className="h-full flex items-center justify-center bg-[var(--bg-primary)]">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto bg-red-100 rounded-lg flex items-center justify-center">
        <span className="text-red-600 text-2xl">⚠</span>
      </div>
      <div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
          Error Loading PDF
        </h3>
        <p className="text-[var(--text-secondary)]">{error}</p>
      </div>
    </div>
  </div>
)
