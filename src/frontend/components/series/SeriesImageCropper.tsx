import { Button, Group, Slider, Stack, Text } from "@mantine/core"
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone"
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import Cropper from "react-easy-crop"
import type { Area } from "react-easy-crop"

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image()
  image.src = imageSrc
  await new Promise<void>((resolve) => {
    image.onload = () => resolve()
  })
  const canvas = document.createElement("canvas")
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  )
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Canvas is empty"))
      },
      "image/jpeg",
      0.92,
    )
  })
}

export function SeriesImageCropper({
  seriesId,
  onSuccess,
}: {
  seriesId: number
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [uploading, setUploading] = useState(false)

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  function handleDrop(files: File[]) {
    const file = files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleUpload() {
    if (!imageSrc || !croppedAreaPixels) return
    setUploading(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      const formData = new FormData()
      formData.append("image", blob, "image.jpg")
      await fetch(`/api/series/${seriesId}/image`, {
        method: "POST",
        body: formData,
      })
      await queryClient.invalidateQueries({ queryKey: ["series"] })
      onSuccess()
    } finally {
      setUploading(false)
    }
  }

  if (!imageSrc) {
    return (
      <Dropzone onDrop={handleDrop} accept={IMAGE_MIME_TYPE} maxFiles={1}>
        <Group
          justify="center"
          gap="xl"
          mih={200}
          style={{ pointerEvents: "none" }}
        >
          <Dropzone.Accept>
            <IconUpload size={48} color="var(--mantine-color-blue-6)" />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={48} color="var(--mantine-color-red-6)" />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto size={48} color="var(--mantine-color-dimmed)" />
          </Dropzone.Idle>
          <Stack gap={4} align="center">
            <Text size="xl" fw={500}>
              Drop image here or click to select
            </Text>
            <Text size="sm" c="dimmed">
              Supports PNG, JPG, WEBP, GIF
            </Text>
          </Stack>
        </Group>
      </Dropzone>
    )
  }

  return (
    <Stack>
      <div style={{ position: "relative", height: 360, background: "#000" }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={4 / 3}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <Stack gap={4}>
        <Text size="sm" c="dimmed">
          Zoom
        </Text>
        <Slider
          value={zoom}
          onChange={setZoom}
          min={1}
          max={3}
          step={0.05}
        />
      </Stack>
      <Group justify="flex-end">
        <Button variant="subtle" onClick={() => setImageSrc(null)}>
          Change Image
        </Button>
        <Button onClick={handleUpload} loading={uploading}>
          Save
        </Button>
      </Group>
    </Stack>
  )
}
