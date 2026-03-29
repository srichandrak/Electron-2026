import React from 'react';

// Import context providers from UI package
import {
  OBCRAGProvider,
  AuthProvider,
  ThemeProvider,
  NotificationProvider,
  FileProvider,
  useFiles
} from '@electron-2026/ui';

// Import PDF viewer from pdf-viewer package
import { EmbedPDFViewer } from '@electron-2026/pdf-viewer';

// Placeholder components - these will be migrated to @electron-2026/ui
// For now, keeping them in the desktop app for a working baseline

const TitleBar = () => {
  return (
    <div className="titlebar h-10 bg-[var(--bg-sidebar)] border-b border-[var(--border)] flex items-center justify-between px-4">
      <div className="text-sm font-medium text-[var(--text-primary)]">
        PlanCode ProMax
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.electronAPI?.minimizeWindow()}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--hover-bg)] rounded"
        >
          −
        </button>
        <button
          onClick={() => window.electronAPI?.maximizeWindow()}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--hover-bg)] rounded"
        >
          □
        </button>
        <button
          onClick={() => window.electronAPI?.closeWindow()}
          className="w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white rounded"
        >
          ×
        </button>
      </div>
    </div>
  );
};

const Workspace = () => {
  const { currentFile } = useFiles();

  if (!currentFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center text-[var(--text-secondary)]">
          <h2 className="text-xl font-medium mb-2">Welcome to PlanCode ProMax</h2>
          <p>Upload a PDF file to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0">
      <EmbedPDFViewer file={currentFile} />
    </div>
  );
};

function App() {
  return (
    <OBCRAGProvider>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <FileProvider>
              <div className="h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
                <TitleBar />
                <div className="flex-1 flex min-h-0">
                  <Workspace />
                </div>
              </div>
            </FileProvider>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </OBCRAGProvider>
  );
}

export default App;
