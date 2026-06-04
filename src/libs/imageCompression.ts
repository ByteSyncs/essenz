import imageCompression from 'browser-image-compression'

export const optimizeImage = async (file: File, isLogo: boolean = false): Promise<File> => {
  const options = {
    maxSizeMB: isLogo ? 0.2 : 0.8,
    maxWidthOrHeight: isLogo ? 400 : 1920,
    useWebWorker: true,
    fileType: 'image/webp',
  }

  try {
    return await imageCompression(file, options)
  } catch (error) {
    console.error('Compression error:', error)
    throw error
  }
}
