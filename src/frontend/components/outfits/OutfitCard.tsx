import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { IconCamera, IconPencil, IconTrash, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "@/frontend/api"
import { ImageCropper } from "../ImageCropper"
import { EditOutfitForm } from "./EditOutfitForm"

export function OutfitCard({
  outfit,
  onClick,
}: {
  outfit: any
  onClick?: () => void
}) {
  const queryClient = useQueryClient()
  const [editOpened, setEditOpened] = useState(false)
  const [uploadOpened, setUploadOpened] = useState(false)
  const [imageCacheBuster, setImageCacheBuster] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    await api.outfits({ id: outfit.id }).delete()
    await queryClient.invalidateQueries({ queryKey: ["outfits"] })
    setConfirmDelete(false)
  }

  return (
    <>
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={{ cursor: onClick ? "pointer" : undefined }}
        onClick={onClick}
      >
        {outfit.image_path && (
          <Card.Section style={{ position: "relative" }}>
            <Image
              src={`${outfit.image_path}${imageCacheBuster ? `?t=${imageCacheBuster}` : ""}`}
              height={500}
              fit="cover"
              style={{ pointerEvents: "none" }}
            />
            <ActionIcon
              style={{ position: "absolute", top: 8, right: 8 }}
              variant="filled"
              color="dark"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setUploadOpened(true) }}
              aria-label="Change image"
            >
              <IconCamera size={14} />
            </ActionIcon>
          </Card.Section>
        )}

        <Group
          justify="space-between"
          wrap="nowrap"
          mt={outfit.image_path ? "md" : 0}
        >
          {outfit.image_path ? (
            <Text size="sm" c="dimmed" fw={500}>
              {outfit.characterName ? `${outfit.characterName} - ${outfit.name}` : outfit.name}
            </Text>
          ) : (
            <Title order={4}>{outfit.characterName ? `${outfit.characterName} - ${outfit.name}` : outfit.name}</Title>
          )}
          <ActionIcon.Group>
            {!outfit.image_path && (
              <ActionIcon
                variant="light"
                onClick={(e) => { e.stopPropagation(); setUploadOpened(true) }}
                aria-label="Add image"
              >
                <IconCamera size={20} />
              </ActionIcon>
            )}
            <ActionIcon
              variant="light"
              color="green"
              onClick={(e) => { e.stopPropagation(); setEditOpened(true) }}
            >
              <IconPencil size={20} />
            </ActionIcon>
            <ActionIcon
              variant="light"
              color="red"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
            >
              <IconTrash size={20} />
            </ActionIcon>
          </ActionIcon.Group>
        </Group>

        <Group gap="xs" mt="xs">
          <Badge color="teal" variant="light">
            {outfit.items.length} {outfit.items.length === 1 ? "item" : "items"}
          </Badge>
        </Group>
      </Card>

      <Modal
        opened={uploadOpened}
        onClose={() => setUploadOpened(false)}
        title={`${outfit.image_path ? "Change" : "Add"} Image — ${outfit.name}`}
        centered
        size="lg"
      >
        <ImageCropper
          uploadUrl={`/api/outfits/${outfit.id}/image`}
          queryKey="outfits"
          onSuccess={() => { setUploadOpened(false); setImageCacheBuster(Date.now()) }}
          schoolIdoluCharacterName={
            outfit.seriesName?.toLowerCase().includes("love live") ? outfit.characterName : undefined
          }
          schoolIdoluOutfitName={
            outfit.seriesName?.toLowerCase().includes("love live") ? outfit.name : undefined
          }
        />
      </Modal>

      <Modal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        title="Edit Outfit"
        centered
      >
        <EditOutfitForm outfit={outfit} onSuccess={() => setEditOpened(false)} />
      </Modal>

      <Modal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Outfit"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Are you sure you want to delete <strong>{outfit.name}</strong>?
          </Text>
          <Group justify="flex-end">
            <Button
              onClick={() => setConfirmDelete(false)}
              leftSection={<IconX size={20} />}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="red"
              onClick={handleDelete}
              leftSection={<IconTrash size={20} />}
            >
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
