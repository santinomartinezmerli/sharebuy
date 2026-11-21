// Client-side image compression before uploading to Supabase Storage.
//
// Contract: this function never makes the caller lose a post because of an odd photo.
//   - Compression works      -> returns a smaller WebP (or JPEG) File.
//   - Compression fails, but the browser can display the format (jpeg/png/webp/gif)
//                            -> returns the ORIGINAL file, upload still succeeds.
//   - The browser cannot decode it at all (e.g. HEIC on Chrome/Android)
//                            -> throws ImageProcessError with a message naming the file,
//                               so the UI can show a clear error and keep the form intact.

const DISPLAYABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const MAX_POST_SIZE = 1280
export const MAX_AVATAR_SIZE = 512

export class ImageProcessError extends Error {
  constructor(fileName) {
    super(`No pudimos procesar "${fileName}". Probá con otra foto (JPG o PNG).`)
    this.name = 'ImageProcessError'
    this.fileName = fileName
  }
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // fall through to the <img> decoder
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')) }
    img.src = url
  })
}

function toBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

function renamed(file, blob, ext) {
  const base = file.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() })
}

/**
 * @param {File} file
 * @param {{ maxSize?: number, quality?: number }} [options]
 * @returns {Promise<File>} the file to upload (compressed, or the original as a fallback)
 * @throws {ImageProcessError} only when the image cannot be decoded AND is not a displayable format
 */
export async function compressImage(file, { maxSize = MAX_POST_SIZE, quality = 0.8 } = {}) {
  // Animated GIFs would lose their animation on a canvas: leave them alone.
  if (file.type === 'image/gif') return file

  let source
  try {
    source = await decode(file)
  } catch {
    if (DISPLAYABLE_TYPES.includes(file.type)) return file
    throw new ImageProcessError(file.name)
  }

  try {
    const scale = Math.min(1, maxSize / Math.max(source.width, source.height))
    const width = Math.round(source.width * scale)
    const height = Math.round(source.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(source, 0, 0, width, height)
    source.close?.()

    // Prefer WebP; some browsers silently return PNG for unsupported types, so check the result.
    let blob = await toBlob(canvas, 'image/webp', quality)
    let ext = 'webp'
    if (!blob || blob.type !== 'image/webp') {
      blob = await toBlob(canvas, 'image/jpeg', quality)
      ext = 'jpg'
    }

    // Compression failed, or it made the file bigger: keep the original if it is displayable.
    if (!blob || (blob.size >= file.size && DISPLAYABLE_TYPES.includes(file.type))) {
      if (DISPLAYABLE_TYPES.includes(file.type)) return file
      if (!blob) throw new ImageProcessError(file.name)
    }

    return renamed(file, blob, ext)
  } catch (err) {
    if (err instanceof ImageProcessError) throw err
    if (DISPLAYABLE_TYPES.includes(file.type)) return file
    throw new ImageProcessError(file.name)
  }
}
