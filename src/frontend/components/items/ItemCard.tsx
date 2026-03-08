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
import { EditItemForm } from "./EditItemForm"

const TYPE_COLORS: Record<string, string> = {
  Clothes: "blue",
  Wig: "pink",
  Shoes: "orange",
  Accessories: "yellow",
  Prop: "gray",
  Materials: "teal",
}

export function ItemCard({ item }: { item: any }) {
  const queryClient = useQueryClient()
  const [editOpened, setEditOpened] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    await api.items({ id: item.id }).delete()
    await queryClient.invalidateQueries({ queryKey: ["items"] })
    setConfirmDelete(false)
  }

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="xs">
          <Group justify="space-between" wrap="nowrap">
            <Title order={4}>{item.name}</Title>
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
            <Badge color={TYPE_COLORS[item.type] ?? "gray"} variant="light">
              {item.type}
            </Badge>
            {item.seriesName && (
              <Badge color="indigo" variant="outline">
                {item.seriesName}
              </Badge>
            )}
          </Group>
          {item.characterName && (
            <Text size="sm" c="dimmed">
              {item.characterName}
            </Text>
          )}
          {item.locationName && (
            <Text size="sm" c="dimmed">
              {item.locationName}
            </Text>
          )}
        </Stack>
      </Card>

      <Modal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        title="Edit Item"
        centered
      >
        <EditItemForm item={item} onSuccess={() => setEditOpened(false)} />
      </Modal>

      <Modal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Item"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Are you sure you want to delete <strong>{item.name}</strong>?
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
