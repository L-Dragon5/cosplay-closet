import {
  ActionIcon,
  Button,
  Chip,
  Group,
  MultiSelect,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core"
import { AppModal } from "@/frontend/components/AppModal"
import { IconLayoutGridAdd, IconNotebook, IconPencil, IconTrash, IconX } from "@tabler/icons-react"
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
import { AddItemToOutfitForm } from "./AddItemToOutfitForm"
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
  const [filterSeries, setFilterSeries] = useState<string[]>([])
  const [filterCharacters, setFilterCharacters] = useState<string[]>([])
  const [filterTypes, setFilterTypes] = useState<string[]>([])
  const [filterLocations, setFilterLocations] = useState<string[]>([])
  const [filterNoSeries, setFilterNoSeries] = useState(false)
  const [filterNoCharacter, setFilterNoCharacter] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [notesItem, setNotesItem] = useState<Item | null>(null)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<Item | null>(null)
  const [addToOutfitItem, setAddToOutfitItem] = useState<Item | null>(null)

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

  const seriesOptions = (series ?? []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }))
  const characterOptions = (characters ?? []).map((c) => ({
    value: String(c.id),
    label: c.name,
  }))
  const typeOptions = [
    "Clothes",
    "Wig",
    "Shoes",
    "Accessories",
    "Prop",
    "Materials",
  ]
  const locationOptions = (locations ?? []).map((l) => ({
    value: String(l.id),
    label: l.name,
  }))

  const filterSlot = (
    <Stack gap="sm" mb="xs">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
        <MultiSelect
          placeholder="Series"
          data={seriesOptions}
          value={filterSeries}
          onChange={setFilterSeries}
          searchable
          clearable
        />
        <MultiSelect
          placeholder="Characters"
          data={characterOptions}
          value={filterCharacters}
          onChange={setFilterCharacters}
          searchable
          clearable
        />
        <MultiSelect
          placeholder="Type"
          data={typeOptions}
          value={filterTypes}
          onChange={setFilterTypes}
          clearable
        />
        <MultiSelect
          placeholder="Location"
          data={locationOptions}
          value={filterLocations}
          onChange={setFilterLocations}
          searchable
          clearable
        />
      </SimpleGrid>
      <Group gap="sm">
        <Chip checked={filterNoSeries} onChange={setFilterNoSeries}>No Series</Chip>
        <Chip checked={filterNoCharacter} onChange={setFilterNoCharacter}>No Character</Chip>
      </Group>
    </Stack>
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
        filterSlot={filterSlot}
      >
        {(search, view) => {
          const hasActiveFilters =
            filterSeries.length > 0 ||
            filterCharacters.length > 0 ||
            filterTypes.length > 0 ||
            filterLocations.length > 0 ||
            filterNoSeries ||
            filterNoCharacter
          const filtered = (data ?? [])
            .filter((item) =>
              item.name.toLowerCase().includes(search.toLowerCase()),
            )
            .filter((item) => {
              if (!hasActiveFilters) return true
              return (
                (filterSeries.length > 0 &&
                  item.series_id !== null &&
                  filterSeries.includes(String(item.series_id))) ||
                (filterCharacters.length > 0 &&
                  item.character_id !== null &&
                  filterCharacters.includes(String(item.character_id))) ||
                (filterTypes.length > 0 && filterTypes.includes(item.type)) ||
                (filterLocations.length > 0 &&
                  item.location_id !== null &&
                  filterLocations.includes(String(item.location_id))) ||
                (filterNoSeries && item.series_id === null) ||
                (filterNoCharacter && item.character_id === null)
              )
            })
          if (!filtered.length) {
            return (
              <Text c="dimmed">
                {hasActiveFilters || search ? "No matches found." : "No items added yet."}
              </Text>
            )
          }
          if (view === "table") {
            return (
              <VirtualTable
                rows={filtered}
                columns={[
                  { header: "Name", width: "25%", render: (item) => item.name },
                  { header: "Type", width: 110, render: (item) => item.type },
                  {
                    header: "Series",
                    width: "20%",
                    render: (item) => item.seriesName ?? "—",
                  },
                  {
                    header: "Character",
                    width: "20%",
                    render: (item) => item.characterName ?? "—",
                  },
                  {
                    header: "Location",
                    width: "20%",
                    render: (item) => item.locationName ?? "—",
                  },
                  {
                    header: "Actions",
                    width: 160,
                    render: (item) => (
                      <ActionIcon.Group>
                        {item.notes && (
                          <ActionIcon
                            variant="light"
                            color="gray"
                            onClick={(e) => {
                              e.stopPropagation()
                              setNotesItem(item)
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
                            setAddToOutfitItem(item)
                          }}
                        >
                          <IconLayoutGridAdd size={20} />
                        </ActionIcon>
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

      <AppModal
        opened={addToOutfitItem !== null}
        onClose={() => setAddToOutfitItem(null)}
        title={addToOutfitItem ? `Add to Outfit Version — ${addToOutfitItem.name}` : "Add to Outfit Version"}
        centered
        size="sm"
      >
        {addToOutfitItem && (
          <AddItemToOutfitForm
            itemId={addToOutfitItem.id}
            onSuccess={() => setAddToOutfitItem(null)}
          />
        )}
      </AppModal>

      <AppModal
        opened={notesItem !== null}
        onClose={() => setNotesItem(null)}
        title="Notes"
        centered
        size="sm"
      >
        <Text>{notesItem?.notes}</Text>
      </AppModal>

      <AppModal
        opened={editingItem !== null}
        onClose={() => setEditingItem(null)}
        title="Edit Item"
        centered
      >
        {editingItem && (
          <EditItemForm
            item={editingItem}
            onSuccess={() => setEditingItem(null)}
          />
        )}
      </AppModal>

      <AppModal
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
      </AppModal>
    </>
  )
}
