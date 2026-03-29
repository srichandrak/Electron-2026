// ArrayBuffer utility functions for PDF handling

// Helper function to safely check if ArrayBuffer is detached
export const isArrayBufferDetached = (buffer) => {
  if (!buffer || !(buffer instanceof ArrayBuffer)) {
    return true
  }

  try {
    // Try to create a view - this will throw if detached
    new Uint8Array(buffer, 0, Math.min(1, buffer.byteLength))
    return buffer.byteLength === 0
  } catch (error) {
    // If we can't create a view, the buffer is detached
    return true
  }
}

// Helper function to clone ArrayBuffer
export const cloneArrayBuffer = (buffer) => {
  if (!buffer || !(buffer instanceof ArrayBuffer)) {
    throw new Error('Invalid ArrayBuffer')
  }

  if (isArrayBufferDetached(buffer)) {
    throw new Error('Cannot clone detached ArrayBuffer')
  }

  // Create a new ArrayBuffer and copy the data
  const cloned = new ArrayBuffer(buffer.byteLength)
  const sourceView = new Uint8Array(buffer)
  const clonedView = new Uint8Array(cloned)
  clonedView.set(sourceView)

  return cloned
}

// Helper function to get valid PDF data with multiple fallback strategies
export const getPDFData = async (file) => {
  console.log('Getting PDF data for file:', file.filename)

  // Strategy 1: Try to use and clone existing content
  if (file.content && file.content instanceof ArrayBuffer) {
    console.log('Found existing content, checking if detached...')

    if (!isArrayBufferDetached(file.content)) {
      console.log('Content is valid, cloning...')
      try {
        return cloneArrayBuffer(file.content)
      } catch (error) {
        console.warn('Failed to clone existing content:', error)
      }
    } else {
      console.warn('Content is detached, falling back to original file')
    }
  }

  // Strategy 2: Re-read from original file
  if (file.originalFile && file.originalFile instanceof File) {
    console.log('Re-reading from original file...')
    try {
      const freshData = await file.originalFile.arrayBuffer()
      console.log('Successfully read fresh data, size:', freshData.byteLength)
      return freshData
    } catch (error) {
      console.error('Failed to read from original file:', error)
      throw new Error(`Failed to read PDF file: ${error.message}`)
    }
  }

  // Strategy 3: Try URL if available
  if (file.url) {
    console.log('Trying to fetch from URL:', file.url)
    try {
      const response = await fetch(file.url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      console.log('Successfully fetched from URL, size:', arrayBuffer.byteLength)
      return arrayBuffer
    } catch (error) {
      console.error('Failed to fetch from URL:', error)
      throw new Error(`Failed to fetch PDF: ${error.message}`)
    }
  }

  // No valid data source found
  throw new Error('No valid PDF data source available')
}
