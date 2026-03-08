import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core"
import { IconPencil, IconTrash, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import type { Item } from "@/backend/items/model"
import { api } from "@/frontend/api"
import {
  useCharactersQuery,
  useItemsQuery,
  useLocationsQuery,
  useSeriesQuery,
} from "@/frontend/queries"
import { SectionShell } from "../SectionShell"
import { VirtualCardGrid } from "../VirtualCardGrid"
import { VirtualTable } from "../VirtualTable"
import { EditItemForm } from "./EditItemForm"
import { ItemCard } from "./ItemCard"

export function ItemsSection() {
  const { data: items, isLoading: iLoading, error: iError } = useItemsQuery()
  const {
    data: characters,
    isLoading: cLoading,
    error: cError,
  } = useCharactersQuery()
  const { data: series, isLoading: sLoading, error: sError } = useSeriesQuery()
  const {
    data: locations,
    isLoading: lLoading,
    error: lError,
  } = useLocationsQuery()
  const queryClient = useQueryClient()
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<Item | null>(null)

  const data = useMemo(
    () =>
      items?.map((item) => ({
        ...item,
        characterName:
          characters?.find((c) => c.id === item.character_id)?.name ?? null,
        seriesName: series?.find((s) => s.id === item.series_id)?.name ?? null,
        locationName:
          locations?.find((l) => l.id === item.location_id)?.name ?? null,
      })),
    [items, characters, series, locations],
  )

  async function handleTableDelete() {
    if (!confirmDeleteItem) return
    await api.items({ id: confirmDeleteItem.id }).delete()
    await queryClient.invalidateQueries({ queryKey: ["items"] })
    setConfirmDeleteItem(null)
  }

  return (
    <>
      <SectionShell
        section="items"
        title="Items"
        isLoading={iLoading || cLoading || sLoading || lLoading}
        error={iError ?? cError ?? sError ?? lError}
      >
        {(search, view) => {
          const filtered = (data ?? []).filter((item) =>
            item.name.toLowerCase().includes(search.toLowerCase()),
          )
          if (!filtered.length) {
            return (
              <Text c="dimmed">
                {search ? "No matches found." : "No items added yet."}
              </Text>
            )
          }
          if (view === "table") {
            return (
              <VirtualTable
                rows={filtered}
                columns={[
                  { header: "Name", render: (item) => item.name },
                  { header: "Type", render: (item) => item.type },
                  {
                    header: "Series",
                    render: (item) => item.seriesName ?? "—",
                  },
                  {
                    header: "Character",
                    render: (item) => item.characterName ?? "—",
                  },
                  {
                    header: "Location",
                    render: (item) => item.locationName ?? "—",
                  },
                  {
                    header: "Actions",
                    render: (item) => (
                      <ActionIcon.Group>
                        <ActionIcon
                          variant="light"
                          color="green"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingItem(item)
                          }}
                        >
                          <IconPencil size={20} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDeleteItem(item)
                          }}
                        >
                          <IconTrash size={20} />
                        </ActionIcon>
                      </ActionIcon.Group>
                    ),
                  },
                ]}
              />
            )
          }
          return (
            <VirtualCardGrid
              items={filtered}
              renderItem={(item) => <ItemCard key={item.id} item={item} />}
            />
          )
        }}
      </SectionShell>

      <Modal
        opened={editingItem !== null}
        onClose={() => setEditingItem(null)}
        title="Edit Item"
        centered
      >
        {editingItem && (
          <EditItemForm item={editingItem} onSuccess={() => setEditingItem(null)} />
        )}
      </Modal>

      <Modal
        opened={confirmDeleteItem !== null}
        onClose={() => setConfirmDeleteItem(null)}
        title="Delete Item"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Are you sure you want to delete{" "}
            <strong>{confirmDeleteItem?.name}</strong>?
          </Text>
          <Group justify="flex-end">
            <Button
              onClick={() => setConfirmDeleteItem(null)}
              leftSection={<IconX size={20} />}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="red"
              onClick={handleTableDelete}
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
