import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { AppModal } from "@/frontend/components/AppModal"
import { IconLayoutGridAdd, IconNotebook, IconPencil, IconTrash, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "@/frontend/api"
import { AddItemToOutfitForm } from "./AddItemToOutfitForm"
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
  const [notesOpened, setNotesOpened] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addToOutfitOpened, setAddToOutfitOpened] = useState(false)

  async function handleDelete() {
    await api.items({ id: item.id }).delete()
    await queryClient.invalidateQueries({ queryKey: ["items"] })
    setConfirmDelete(false)
  }

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="xs">
          <Stack gap=".25rem">
            {item.seriesName && (
              <Badge color="indigo" size="md" radius="sm" variant="outline">
                {item.seriesName}
              </Badge>
            )}
            {item.characterName && (
              <Badge color="green" size="md" radius="sm" variant="filled">
                {item.characterName}
              </Badge>
            )}
          </Stack>

          <Title order={4}>{item.name}</Title>
          
          <Group gap="xs">
            <Badge color={TYPE_COLORS[item.type] ?? "gray"} variant="light">
              {item.type}
            </Badge>
          </Group>
          
          <Group justify="space-between" align="flex-end" wrap="nowrap">
            {item.locationName && (
              <Text size="sm" c="dimmed">
                {item.locationName}
              </Text>
            )}

            <ActionIcon.Group>
              {item.notes && (
                <ActionIcon
                  variant="light"
                  color="gray"
                  onClick={(e) => {
                    e.stopPropagation()
                    setNotesOpened(true)
                  }}
                >
                  <IconNotebook size={20} />
                </ActionIcon>
              )}
              <ActionIcon
                variant="light"
                color="violet"
                onClick={(e) => {
                  e.stopPropagation()
                  setAddToOutfitOpened(true)
                }}
              >
                <IconLayoutGridAdd size={20} />
              </ActionIcon>
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
        </Stack>
      </Card>

      <AppModal
        opened={addToOutfitOpened}
        onClose={() => setAddToOutfitOpened(false)}
        title={`Add to Outfit Version — ${item.name}`}
        centered
        size="sm"
      >
        <AddItemToOutfitForm
          itemId={item.id}
          onSuccess={() => setAddToOutfitOpened(false)}
        />
      </AppModal>

      <AppModal
        opened={notesOpened}
        onClose={() => setNotesOpened(false)}
        title="Notes"
        centered
        size="sm"
      >
        <Text>{item.notes}</Text>
      </AppModal>

      <AppModal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        title="Edit Item"
        centered
      >
        <EditItemForm item={item} onSuccess={() => setEditOpened(false)} />
      </AppModal>

      <AppModal
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
      </AppModal>
    </>
  )
}
