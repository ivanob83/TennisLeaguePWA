import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import ImageCropModal from './ImageCropModal.jsx'
import { cn } from '../utils.js'

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/**
 * @param {object} props
 * @param {string} [props.label]
 * @param {{ 800?: string, 400?: string, 200?: string } | null} props.value - current image URLs
 * @param {(imageSrc: string, croppedAreaPixels: object) => Promise<void>} props.onCrop
 * @param {() => void} [props.onRemove]
 * @param {boolean} [props.uploading]
 * @param {string} [props.error]
 * @param {boolean} [props.disabled]
 */
export default function ImageUpload({
  label = 'Featured image (optional)',
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

  const previewUrl = value?.[800] || value?.[400] || value?.[200] || null
  const displayError = localError || error

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold uppercase tracking-[0.14em] text-text">{label}</label>

      {previewUrl ? (
        <div
          className="relative w-full overflow-hidden rounded border border-slate-200"
          style={{ aspectRatio: '16/9' }}
        >
          <img
            src={previewUrl}
            alt="Featured"
            className={cn('h-full w-full object-cover', uploading && 'opacity-50')}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Saving…
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex w-full cursor-pointer items-center justify-center rounded border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-primary hover:bg-slate-100"
          style={{ aspectRatio: '16/9' }}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-1 text-text-light">
            <Upload size={20} />
            <span className="text-xs font-semibold">Upload image</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 border border-slate-300 px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Upload size={13} />
          {previewUrl ? 'Change image' : 'Upload image'}
        </button>

        {previewUrl && onRemove && (
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

      {displayError && <p className="text-xs text-rose-500">{displayError}</p>}
      <p className="text-xs text-text-light">JPG, PNG or WebP · max 5 MB · 16:9 crop</p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />

      <ImageCropModal
        open={modalOpen}
        imageSrc={imageSrc}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
