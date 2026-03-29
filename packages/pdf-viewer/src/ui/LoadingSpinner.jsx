// Loading component for PDF viewer
export const LoadingSpinner = ({ progress, filename }) => (
  <div className="h-full flex items-center justify-center bg-[var(--bg-primary)]">
    <div className="text-center space-y-4">
      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
      <p className="text-[var(--text-secondary)]">
        Loading PDF... {progress > 0 && `${progress}%`}
      </p>
      {progress > 0 && (
        <div className="w-48 mx-auto bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <p className="text-sm text-[var(--text-secondary)]">{filename}</p>
    </div>
  </div>
)
