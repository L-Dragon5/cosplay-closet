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
import { EditCharacterForm } from "./EditCharacterForm"

export function CharacterCard({
  character,
  onClick,
}: {
  character: any
  onClick?: () => void
}) {
  const queryClient = useQueryClient()
  const [editOpened, setEditOpened] = useState(false)
  const [uploadOpened, setUploadOpened] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    await api.characters({ id: character.id }).delete()
    await queryClient.invalidateQueries({ queryKey: ["characters"] })
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
        {character.image_path && (
          <Card.Section style={{ position: "relative" }}>
            <Image src={character.image_path} height={500} fit="cover" />
            <ActionIcon
              style={{ position: "absolute", top: 8, right: 8 }}
              variant="filled"
              color="dark"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setUploadOpened(true)
              }}
              aria-label="Change image"
            >
              <IconCamera size={14} />
            </ActionIcon>
          </Card.Section>
        )}

        <Badge
          color="indigo"
          size="lg"
          radius="sm"
          variant="outline"
          mt={character.image_path ? "md" : 0}
        >
          {character.seriesName ?? "No Series"}
        </Badge>
        <Group justify="space-between" wrap="nowrap" my="xs">
          {character.image_path ? (
            <Text size="sm" c="dimmed" fw={500}>
              {character.name}
            </Text>
          ) : (
            <Title order={4}>{character.name}</Title>
          )}
          <ActionIcon.Group>
            {!character.image_path && (
              <ActionIcon
                variant="light"
                onClick={(e) => {
                  e.stopPropagation()
                  setUploadOpened(true)
                }}
                aria-label="Add image"
              >
                <IconCamera size={20} />
              </ActionIcon>
            )}
            <ActionIcon
              variant="light"
              color="green"
              onClick={(e) => {
                e.stopPropagation()
                setEditOpened(true)
              }}
            >
              <IconPencil size={20} />
            </ActionIcon>
            <ActionIcon
              variant="light"
              color="red"
              onClick={(e) => {
                e.stopPropagation()
                setConfirmDelete(true)
              }}
            >
              <IconTrash size={20} />
            </ActionIcon>
          </ActionIcon.Group>
        </Group>
      </Card>

      <Modal
        opened={uploadOpened}
        onClose={() => setUploadOpened(false)}
        title={`${character.image_path ? "Change" : "Add"} Image — ${character.name}`}
        centered
        size="lg"
      >
        <ImageCropper
          uploadUrl={`/api/characters/${character.id}/image`}
          queryKey="characters"
          onSuccess={() => setUploadOpened(false)}
        />
      </Modal>

      <Modal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        title="Edit Character"
        centered
      >
        <EditCharacterForm
          character={character}
          onSuccess={() => setEditOpened(false)}
        />
      </Modal>

      <Modal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Character"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Are you sure you want to delete <strong>{character.name}</strong>?
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
