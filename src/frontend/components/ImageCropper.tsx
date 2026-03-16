import {
  Button,
  Divider,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core"
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone"
import { IconLink, IconPhoto, IconUpload, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import Cropper from "react-cropper"
import "cropperjs/dist/cropper.css"
import {
  useJikanCharacterImages,
  useJikanSeriesImages,
} from "@/frontend/hooks/useJikanCharacters"
import { useSchoolIdoluImages } from "@/frontend/hooks/useSchoolIdoluImages"

export function ImageCropper({
  uploadUrl,
  queryKey,
  onSuccess,
  jikanSearchName,
  jikanCharacterName,
  schoolIdoluCharacterName,
  schoolIdoluOutfitName,
}: {
  uploadUrl: string
  queryKey: string
  onSuccess: () => void
  jikanSearchName?: string
  jikanCharacterName?: string
  schoolIdoluCharacterName?: string
  schoolIdoluOutfitName?: string
}) {
  const queryClient = useQueryClient()
  const cropperRef = useRef<HTMLImageElement>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState("")
  const [uploading, setUploading] = useState(false)
  const { data: jikanImages, isFetching: jikanFetching } = useJikanSeriesImages(
    jikanSearchName ?? null,
  )
  const { data: jikanCharImages, isFetching: jikanCharFetching } =
    useJikanCharacterImages(jikanCharacterName ?? null)
  const { data: schoolIdoluImages, isFetching: schoolIdoluFetching } =
    useSchoolIdoluImages(
      schoolIdoluCharacterName ?? null,
      schoolIdoluOutfitName ?? null,
    )
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
          (b: Blob | null) =>
            b ? resolve(b) : reject(new Error("Canvas is empty")),
          "image/jpeg",
          0.92,
        ),
      )
      const formData = new FormData()
      formData.append("image", blob, "image.jpg")
      await fetch(uploadUrl, { method: "POST", body: formData })
      await queryClient.invalidateQueries({ queryKey: [queryKey] })
      onSuccess()
    } finally {
      setUploading(false)
    }
  }

  if (!imageSrc) {
    return (
      <Stack>
        <Dropzone onDrop={handleDrop} accept={IMAGE_MIME_TYPE} maxFiles={1}>
          <Group
            justify="center"
            gap="xl"
            mih={180}
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
        <Divider label="or paste a URL" labelPosition="center" />
        <TextInput
          placeholder="https://example.com/image.jpg"
          leftSection={<IconLink size={16} />}
          value={urlInput}
          onChange={(e) => setUrlInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && urlInput.trim())
              setImageSrc(urlInput.trim())
          }}
          rightSection={
            <Button
              size="xs"
              variant="light"
              disabled={!urlInput.trim()}
              onClick={() => setImageSrc(urlInput.trim())}
            >
              Load
            </Button>
          }
          rightSectionWidth={64}
        />
        {jikanSearchName && (
          <>
            <Divider label="or pick from MyAnimeList" labelPosition="center" />
            {jikanFetching && (
              <Text size="xs" c="dimmed">
                Searching MyAnimeList…
              </Text>
            )}
            {jikanImages && jikanImages.length > 0 && (
              <SimpleGrid cols={3} spacing="xs">
                {jikanImages.map((img) => (
                  <Stack
                    key={img.malId}
                    gap={4}
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setImageSrc(
                        `/api/proxy-image?url=${encodeURIComponent(img.imageUrl)}`,
                      )
                    }
                  >
                    <Image
                      src={`/api/proxy-image?url=${encodeURIComponent(img.imageUrl)}`}
                      height={120}
                      fit="cover"
                      radius="sm"
                    />
                    <Text size="xs" c="dimmed" lineClamp={2} ta="center">
                      {img.title}
                    </Text>
                  </Stack>
                ))}
              </SimpleGrid>
            )}
          </>
        )}
        {jikanCharacterName && (
          <>
            <Divider label="or pick from MyAnimeList" labelPosition="center" />
            {jikanCharFetching && (
              <Text size="xs" c="dimmed">
                Searching MyAnimeList…
              </Text>
            )}
            {jikanCharImages && jikanCharImages.length > 0 && (
              <SimpleGrid cols={3} spacing="xs">
                {jikanCharImages.map((img) => (
                  <Stack
                    key={img.malId}
                    gap={4}
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setImageSrc(
                        `/api/proxy-image?url=${encodeURIComponent(img.imageUrl)}`,
                      )
                    }
                  >
                    <Image
                      src={`/api/proxy-image?url=${encodeURIComponent(img.imageUrl)}`}
                      height={120}
                      fit="cover"
                      radius="sm"
                    />
                    <Text size="xs" c="dimmed" lineClamp={2} ta="center">
                      {img.title}
                    </Text>
                  </Stack>
                ))}
              </SimpleGrid>
            )}
          </>
        )}
        {(schoolIdoluCharacterName || schoolIdoluOutfitName) && (
          <>
            <Divider
              label="or pick from School Idol Tomodachi"
              labelPosition="center"
            />
            {schoolIdoluFetching && (
              <Text size="xs" c="dimmed">
                Searching School Idol Tomodachi…
              </Text>
            )}
            {schoolIdoluImages && schoolIdoluImages.length > 0 && (
              <SimpleGrid cols={3} spacing="xs">
                {schoolIdoluImages.map((img, i) => (
                  <Stack
                    key={i}
                    gap={4}
                    style={{ cursor: "pointer" }}
                    onClick={() => setImageSrc(img.imageUrl)}
                  >
                    <Image
                      src={img.imageUrl}
                      height={120}
                      fit="cover"
                      radius="sm"
                    />
                    <Text size="xs" c="dimmed" lineClamp={2} ta="center">
                      {img.title}
                    </Text>
                  </Stack>
                ))}
              </SimpleGrid>
            )}
          </>
        )}
      </Stack>
    )
  }

  return (
    <Stack>
      <Cropper
        src={imageSrc}
        style={{ height: 360, width: "100%" }}
        guides
        viewMode={1}
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
