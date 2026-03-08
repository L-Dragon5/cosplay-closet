import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { IconPencil, IconTrash, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "@/frontend/api"
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
        style={{
          cursor: onClick ? "pointer" : undefined,
        }}
        onClick={onClick}
      >
        <Group justify="space-between" wrap="nowrap" mb="xs">
          <Title order={4}>{character.name}</Title>
          <ActionIcon.Group orientation="vertical">
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
        <Group gap="xs">
          {character.seriesName ? (
            <Badge color="blue" variant="light">
              {character.seriesName}
            </Badge>
          ) : (
            <Badge color="gray" variant="light">
              No Series
            </Badge>
          )}
        </Group>
      </Card>

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
