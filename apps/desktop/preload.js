const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Window state changes
  onWindowStateChange: (callback) => {
    const subscription = (event, state) => callback(state)
    ipcRenderer.on('window-state-changed', subscription)
    return () => ipcRenderer.removeListener('window-state-changed', subscription)
  },

  // File dialog for PDF
  selectPdfFile: () => ipcRenderer.invoke('select-pdf-file'),

  // OBC RAG API
  obcRag: {
    setApiKey: (key) => ipcRenderer.invoke('obc-rag:set-api-key', key),
    getApiKey: () => ipcRenderer.invoke('obc-rag:get-api-key'),
    hasApiKey: () => ipcRenderer.invoke('obc-rag:has-api-key'),
    initialize: (key) => ipcRenderer.invoke('obc-rag:initialize', key),
    setupStore: () => ipcRenderer.invoke('obc-rag:setup-store'),
    uploadDocuments: () => ipcRenderer.invoke('obc-rag:upload-documents'),
    generateQuestions: () => ipcRenderer.invoke('obc-rag:generate-questions'),
    query: (question) => ipcRenderer.invoke('obc-rag:query', question),
    getStatus: () => ipcRenderer.invoke('obc-rag:get-status'),
    onUploadProgress: (callback) => ipcRenderer.on('obc-rag:upload-progress', (event, data) => callback(data)),
  }
});
