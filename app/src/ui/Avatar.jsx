import { cn } from '../utils.js'

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

/**
 * Resolves the best URL from either a plain src string or an avatarUrls object.
 * Prefers the smallest size that fits the requested hint (80 or 100 for small avatars).
 */
function resolveUrl(src, urls, sizeHint = 100) {
  if (urls && typeof urls === 'object') {
    return urls[sizeHint] || urls[80] || urls[100] || urls[200] || urls[400] || null
  }
  return src || null
}

export default function Avatar({
  src,
  urls,          // avatarUrls object { 400, 200, 100, 80 }
  sizeHint = 100,
  name,
  fallback,
  className,
  fallbackClassName,
  imgClassName,
  alt,
  referrerPolicy = 'no-referrer',
}) {
  const fallbackText = fallback || getInitials(name) || '?'
  const resolvedSrc = resolveUrl(src, urls, sizeHint)

  if (resolvedSrc) {
    const src = resolvedSrc
    return (
      <span className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full', className)}>
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={cn('h-full w-full object-cover', imgClassName)}
          referrerPolicy={referrerPolicy}
        />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-white uppercase',
        className,
        fallbackClassName
      )}
      aria-label={alt || name || 'Avatar'}
    >
      {fallbackText}
    </span>
  )
}