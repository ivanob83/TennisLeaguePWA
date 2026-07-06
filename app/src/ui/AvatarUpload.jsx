import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import Avatar from './Avatar.jsx'
import AvatarCropModal from './AvatarCropModal.jsx'
import { cn } from '../utils.js'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/**
 * @param {object} props
 * @param {string} props.name - player name for fallback initials
 * @param {{ 400?: string, 200?: string, 100?: string, 80?: string } | null} props.value - current avatar URLs
 * @param {(croppedAreaPixels: object) => Promise<void>} props.onCrop - called with cropped area after confirm
 * @param {() => void} [props.onRemove] - called when user removes the avatar
 * @param {boolean} [props.uploading] - show uploading state
 * @param {string} [props.error]
 * @param {boolean} [props.disabled]
 */
export default function AvatarUpload({
  name,
  value,
  onCrop,
  onRemove,
  uploading = false,
  error,
  disabled = false,
}) {
  const inputRef = useRef(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [localError, setLocalError] = useState(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setLocalError(null)

    if (!ACCEPTED.includes(file.type)) {
      setLocalError('Only JPG, PNG, or WebP images are allowed.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setLocalError('Image must be smaller than 5 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result)
      setModalOpen(true)
    }
    reader.readAsDataURL(file)
  }

  async function handleConfirm(croppedAreaPixels) {
    setModalOpen(false)
    await onCrop(imageSrc, croppedAreaPixels)
    setImageSrc(null)
  }

  function handleClose() {
    setModalOpen(false)
    setImageSrc(null)
  }

  const displayError = localError || error

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold uppercase tracking-[0.14em] text-text">
        Avatar (optional)
      </label>

      <div className="flex items-center gap-4">
        {/* Preview circle */}
        <div className="relative shrink-0">
          <Avatar
            urls={value}
            sizeHint={100}
            name={name || 'Player'}
            className={cn('h-16 w-16 border-2 border-slate-200', uploading && 'opacity-50')}
            fallbackClassName="text-lg font-black"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Saving…
              </span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 border border-slate-300 px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Upload size={13} />
            {value ? 'Change photo' : 'Upload photo'}
          </button>

          {value && onRemove && (
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-light transition-colors hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X size={13} />
              Remove
            </button>
          )}
        </div>
      </div>

      {displayError && <p className="text-xs text-rose-500">{displayError}</p>}

      <p className="text-xs text-text-light">
        JPG, PNG or WebP · max 5 MB · will be cropped to a circle
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />

      <AvatarCropModal
        open={modalOpen}
        imageSrc={imageSrc}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
