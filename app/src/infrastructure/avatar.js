const SIZES = [400, 200, 100, 80]
/**
 * Draws a cropped + resized version of an image onto a canvas and returns a base64 data URL.
 * @param {string} imageSrc - base64 data URL from FileReader
 * @param {{ x: number, y: number, width: number, height: number }} crop - pixel crop area
 * @param {number} size - output square size in px
 * @returns {Promise<string>} base64 data URL
 */
function cropAndResize(imageSrc, crop, size) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size)
      resolve(canvas.toDataURL('image/webp', 0.85))
    }
    image.onerror = reject
    image.src = imageSrc
  })
}

/**
 * Generates 4 size variants and uploads them to the Vite dev server middleware.
 * @param {string} playerId
 * @param {string} imageSrc - base64 data URL from FileReader
 * @param {{ x: number, y: number, width: number, height: number }} croppedAreaPixels
 * @returns {Promise<{ 400: string, 200: string, 100: string, 80: string }>} URL paths
 */
export async function uploadPlayerAvatar(playerId, imageSrc, croppedAreaPixels) {
  const entries = await Promise.all(
    SIZES.map(async (size) => [size, await cropAndResize(imageSrc, croppedAreaPixels, size)])
  )
  const images = Object.fromEntries(entries)

  const response = await fetch('/api/upload-avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, images }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Upload failed (${response.status}): ${text}`)
  }

  const json = await response.json()
  if (json.error) throw new Error(json.error)

  return json.urls
}
