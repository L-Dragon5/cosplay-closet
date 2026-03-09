import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core"
import { AppModal } from "@/frontend/components/AppModal"
import { IconCheck, IconPencil, IconTrash, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "@/frontend/api"

export function LocationCard({
  location,
  itemCount,
  onClick,
}: {
  location: any
  itemCount: number
  onClick: () => void
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(location.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    if (!name.trim() || name === location.name) {
      setEditing(false)
      setName(location.name)
      return
    }
    await api.locations({ id: location.id }).put({ name: name.trim() })
    await queryClient.invalidateQueries({ queryKey: ["locations"] })
    setEditing(false)
  }

  async function handleDelete() {
    await api.locations({ id: location.id }).delete()
    await queryClient.invalidateQueries({ queryKey: ["locations"] })
    setConfirmDelete(false)
  }

  function handleCancel() {
    setName(location.name)
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
            <ActionIcon.Group>
              <ActionIcon variant="light" color="green" onClick={handleSave}>
                <IconCheck size={20} />
              </ActionIcon>
              <ActionIcon variant="light" color="gray" onClick={handleCancel}>
                <IconX size={20} />
              </ActionIcon>
            </ActionIcon.Group>
          </Group>
        ) : (
          <Group justify="space-between" wrap="nowrap">
            <Title order={4}>{location.name}</Title>
            <Group gap="xs" wrap="nowrap">
              <Badge size="lg" color="blue" variant="filled">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </Badge>
              <ActionIcon.Group orientation="vertical">
                <ActionIcon
                  variant="light"
                  color="green"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(true)
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
          </Group>
        )}
      </Card>

      <AppModal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Location"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Are you sure you want to delete <strong>{location.name}</strong>?
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
      </AppModal>
    </>
  )
}
