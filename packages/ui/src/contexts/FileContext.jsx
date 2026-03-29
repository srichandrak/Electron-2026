import { createContext, useContext, useState } from 'react'

const FileContext = createContext()

export const useFiles = () => {
  const context = useContext(FileContext)
  if (!context) {
    throw new Error('useFiles must be used within a FileProvider')
  }
  return context
}

export const FileProvider = ({ children }) => {
  const [files, setFiles] = useState([])
  const [currentFile, setCurrentFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState({})
  const [pdfDocuments, setPdfDocuments] = useState(new Map())

  const addFile = async (file) => {
    console.log('Adding file:', file.name, 'type:', file.type, 'size:', file.size)

    // Read file content for PDFs
    if (file.type === 'application/pdf') {
      try {
        console.log('Reading PDF file as ArrayBuffer...')
        const arrayBuffer = await file.arrayBuffer()
        console.log('ArrayBuffer created, size:', arrayBuffer.byteLength)

        const fileWithContent = {
          id: Date.now() + Math.random(),
          filename: file.name,
          type: file.type,
          size: file.size,
          content: arrayBuffer,
          originalFile: file,
          isOpen: true,
          lastModified: file.lastModified
        }

        setFiles(prev => [...prev, fileWithContent])
        setCurrentFile(fileWithContent)
        return fileWithContent
      } catch (error) {
        console.error('Error reading PDF file:', error)
        throw error
      }
    } else {
      const newFile = {
        id: Date.now() + Math.random(),
        filename: file.name,
        type: file.type,
        size: file.size,
        isOpen: true,
        lastModified: file.lastModified
      }
      setFiles(prev => [...prev, newFile])
      setCurrentFile(newFile)
      return newFile
    }
  }

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const openFile = (file) => {
    setFiles(prev => prev.map(f =>
      f.id === file.id ? { ...f, isOpen: true } : f
    ))
    setCurrentFile(file)
  }

  const closeFile = (fileId) => {
    const openFiles = files.filter(f => f.isOpen)
    const fileIndex = openFiles.findIndex(f => f.id === fileId)

    // Clean up PDF document if it's a PDF file
    const file = files.find(f => f.id === fileId)
    if (file && file.type === 'application/pdf') {
      const pdfDoc = pdfDocuments.get(fileId)
      if (pdfDoc) {
        try {
          pdfDoc.destroy()
        } catch (error) {
          console.warn('Error destroying PDF document:', error)
        }
        setPdfDocuments(prev => {
          const newMap = new Map(prev)
          newMap.delete(fileId)
          return newMap
        })
      }
    }

    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, isOpen: false } : f
    ))

    if (currentFile && currentFile.id === fileId) {
      const remainingOpenFiles = openFiles.filter(f => f.id !== fileId)
      if (remainingOpenFiles.length > 0) {
        const nextIndex = fileIndex < remainingOpenFiles.length ? fileIndex : fileIndex - 1
        setCurrentFile(remainingOpenFiles[nextIndex] || null)
      } else {
        setCurrentFile(null)
      }
    }
  }

  const updateUploadProgress = (filename, progress) => {
    setUploadProgress(prev => ({
      ...prev,
      [filename]: progress
    }))
  }

  const clearUploadProgress = (filename) => {
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[filename]
      return newProgress
    })
  }

  const setPdfDocument = (fileId, pdfDoc) => {
    setPdfDocuments(prev => new Map(prev).set(fileId, pdfDoc))
  }

  const getPdfDocument = (fileId) => {
    return pdfDocuments.get(fileId)
  }

  return (
    <FileContext.Provider value={{
      files,
      currentFile,
      uploadProgress,
      addFile,
      removeFile,
      openFile,
      closeFile,
      updateUploadProgress,
      clearUploadProgress,
      setPdfDocument,
      getPdfDocument
    }}>
      {children}
    </FileContext.Provider>
  )
}
