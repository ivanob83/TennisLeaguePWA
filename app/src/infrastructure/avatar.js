const AVATAR_SIZES = [400, 200, 100, 80]
const COMPETITION_WIDTHS = [800, 400, 200]

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

function cropAndResizeRect(imageSrc, crop, width) {
  const height = Math.round((width * 9) / 16)
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height)
      resolve(canvas.toDataURL('image/webp', 0.85))
    }
    image.onerror = reject
    image.src = imageSrc
  })
}

async function postToApi(endpoint, body) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Upload failed (${response.status}): ${text}`)
  }
  const json = await response.json()
  if (json.error) throw new Error(json.error)
  return json
}

export async function uploadPlayerAvatar(playerId, imageSrc, croppedAreaPixels) {
  const entries = await Promise.all(
    AVATAR_SIZES.map(async (size) => [
      size,
      await cropAndResize(imageSrc, croppedAreaPixels, size),
    ]),
  )
  const images = Object.fromEntries(entries)
  const json = await postToApi('/api/upload-avatar.php', { playerId, images })
  const t = Date.now()
  return Object.fromEntries(Object.entries(json.urls).map(([k, v]) => [k, `${v}?t=${t}`]))
}

export async function uploadCompetitionImage(competitionId, imageSrc, croppedAreaPixels) {
  const entries = await Promise.all(
    COMPETITION_WIDTHS.map(async (width) => [
      width,
      await cropAndResizeRect(imageSrc, croppedAreaPixels, width),
    ]),
  )
  const images = Object.fromEntries(entries)
  const json = await postToApi('/api/upload-competition-image.php', { competitionId, images })
  const t = Date.now()
  return Object.fromEntries(Object.entries(json.urls).map(([k, v]) => [k, `${v}?t=${t}`]))
}
