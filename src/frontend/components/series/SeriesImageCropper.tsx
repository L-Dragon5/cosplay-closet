import { Button, Group, Stack, Text } from "@mantine/core"
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone"
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import Cropper from "react-cropper"
import "cropperjs/dist/cropper.css"

export function SeriesImageCropper({
  seriesId,
  onSuccess,
}: {
  seriesId: number
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const cropperRef = useRef<HTMLImageElement>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  function handleDrop(files: File[]) {
    const file = files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleUpload() {
    const imageElement = cropperRef.current as any
    const cropper = imageElement?.cropper
    if (!cropper) return
    setUploading(true)
    try {
      const canvas = cropper.getCroppedCanvas({ imageSmoothingQuality: "high" })
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b: Blob | null) => (b ? resolve(b) : reject(new Error("Canvas is empty"))),
          "image/jpeg",
          0.92,
        ),
      )
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
      <Cropper
        src={imageSrc}
        style={{ height: 360, width: "100%" }}
        guides
        ref={cropperRef}
      />
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
