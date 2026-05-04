import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import Button from './Button.jsx'

export default function ImageCropModal({ open, imageSrc, onClose, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  if (!open || !imageSrc) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-xl flex-col bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-heading text-base font-black uppercase tracking-tight text-[#212121]">
            Crop Image
          </h2>
          <p className="mt-0.5 text-xs text-text-light">
            Drag to reposition · Scroll to zoom
          </p>
        </div>

        <div className="relative h-72 bg-[#111]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-3">
          <span className="text-xs font-semibold text-text-light uppercase tracking-[0.12em]">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div className="flex justify-end gap-3 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { if (croppedAreaPixels) onConfirm(croppedAreaPixels) }}>
            Crop & Save
          </Button>
        </div>
      </div>
    </div>
  )
}
