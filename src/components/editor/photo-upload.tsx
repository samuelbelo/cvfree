"use client"

import { useCallback, useRef, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { ImageUp, Trash2, User } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"

const OUTPUT_SIZE = 480

/** Crop to a square, scale down and encode as JPEG so the resume JSON stays small. */
async function cropToDataUrl(src: string, area: Area): Promise<string> {
  const img = new Image()
  img.src = src
  await img.decode()
  const canvas = document.createElement("canvas")
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  return canvas.toDataURL("image/jpeg", 0.86)
}

export function PhotoUpload({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)

  const onFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) return toast.error("Pick an image file")
    if (file.size > 15 * 1024 * 1024) return toast.error("Image is larger than 15 MB")
    const reader = new FileReader()
    reader.onload = () => {
      setSource(reader.result as string)
      setZoom(1)
      setCrop({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
  }

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), [])

  const save = async () => {
    if (!source || !area) return
    onChange(await cropToDataUrl(source, area))
    setSource(null)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground hover:ring-2 hover:ring-ring/40"
        aria-label="Upload photo"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <User className="size-7" />
        )}
      </button>
      <div className="flex flex-col items-start gap-1">
        <Button variant="link" size="sm" className="h-auto p-0" onClick={() => input.current?.click()}>
          <ImageUp /> {value ? "Change photo" : "Upload photo"}
        </Button>
        {value ? (
          <Button variant="link" size="sm" className="h-auto p-0 text-muted-foreground" onClick={() => onChange(null)}>
            <Trash2 /> Remove
          </Button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      <Dialog open={Boolean(source)} onOpenChange={(open) => !open && setSource(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop your photo</DialogTitle>
          </DialogHeader>
          <div className="relative h-72 overflow-hidden rounded-lg bg-muted">
            {source ? (
              <Cropper
                image={source}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onComplete}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Zoom</span>
            <Slider min={1} max={3} step={0.01} value={[zoom]} onValueChange={(v) => setZoom(Array.isArray(v) ? v[0] : (v as number))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSource(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Use photo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
