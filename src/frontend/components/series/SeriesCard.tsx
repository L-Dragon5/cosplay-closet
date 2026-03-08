import {
  ActionIcon,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core"
import { IconCheck, IconPencil, IconTrash, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "@/frontend/api"

export function SeriesCard({
  series,
  onClick,
}: {
  series: any
  onClick: () => void
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(series.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    if (!name.trim() || name === series.name) {
      setEditing(false)
      setName(series.name)
      return
    }
    await api.series({ id: series.id }).put({ name: name.trim() })
    await queryClient.invalidateQueries({ queryKey: ["series"] })
    setEditing(false)
  }

  async function handleDelete() {
    await api.series({ id: series.id }).delete()
    await queryClient.invalidateQueries({ queryKey: ["series"] })
    setConfirmDelete(false)
  }

  function handleCancel() {
    setName(series.name)
    setEditing(false)
  }

  return (
    <>
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={{ cursor: editing ? "default" : "pointer" }}
        onClick={editing ? undefined : onClick}
      >
        {editing ? (
          <Group gap="xs" wrap="nowrap">
            <TextInput
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
                if (e.key === "Escape") handleCancel()
              }}
              size="sm"
              style={{ flex: 1 }}
              autoFocus
            />
            <ActionIcon variant="light" color="green" onClick={handleSave}>
              <IconCheck size={16} />
            </ActionIcon>
            <ActionIcon variant="light" color="gray" onClick={handleCancel}>
              <IconX size={16} />
            </ActionIcon>
          </Group>
        ) : (
          <Group justify="space-between" wrap="nowrap">
            <Title order={4}>{series.name}</Title>
            <Group gap="xs" wrap="nowrap">
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditing(true)
                }}
              >
                <IconPencil size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmDelete(true)
                }}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Group>
        )}
      </Card>

      <Modal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Series"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Are you sure you want to delete <strong>{series.name}</strong>?
          </Text>
          <Group justify="flex-end">
            <Button
              onClick={() => setConfirmDelete(false)}
              leftSection={<IconX size={16} />}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="red"
              onClick={handleDelete}
              leftSection={<IconTrash size={16} />}
            >
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
