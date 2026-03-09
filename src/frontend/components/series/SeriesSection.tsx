import {
  ActionIcon,
  Button,
  Drawer,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  useDrawersStack,
} from "@mantine/core"
import {
  IconCheck,
  IconEye,
  IconPencil,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import type { Series } from "@/backend/series/model"
import { api } from "@/frontend/api"
import {
  useCharactersQuery,
  useItemsQuery,
  useLocationsQuery,
  useOutfitsQuery,
  useSeriesQuery,
} from "@/frontend/queries"
import { CharacterCard } from "../characters/CharacterCard"
import { OutfitCard } from "../outfits/OutfitCard"
import { OutfitItemsDrawer } from "../outfits/OutfitItemsDrawer"
import { SectionShell } from "../SectionShell"
import { VirtualCardGrid } from "../VirtualCardGrid"
import { VirtualTable } from "../VirtualTable"
import { SeriesCard } from "./SeriesCard"

export function SeriesSection() {
  const stack = useDrawersStack(["series", "character-outfits", "outfit-items"])
  const seriesReg = stack.register("series")
  const characterReg = stack.register("character-outfits")
  const outfitItemsReg = stack.register("outfit-items")
  const { data, isLoading, error } = useSeriesQuery()
  const { data: characters } = useCharactersQuery()
  const { data: outfits } = useOutfitsQuery()
  const { data: items } = useItemsQuery()
  const { data: locations } = useLocationsQuery()
  const queryClient = useQueryClient()
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null)
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(
    null,
  )
  const [selectedOutfitId, setSelectedOutfitId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [confirmDeleteSeries, setConfirmDeleteSeries] = useState<Series | null>(
    null,
  )

  async function handleTableSave(series: Series) {
    const trimmed = editingName.trim()
    if (!trimmed || trimmed === series.name) {
      setEditingId(null)
      return
    }
    await api.series({ id: series.id }).put({ name: trimmed })
    await queryClient.invalidateQueries({ queryKey: ["series"] })
    setEditingId(null)
  }

  async function handleTableDelete() {
    if (!confirmDeleteSeries) return
    await api.series({ id: confirmDeleteSeries.id }).delete()
    await queryClient.invalidateQueries({ queryKey: ["series"] })
    setConfirmDeleteSeries(null)
  }

  const selectedSeries = data?.find((s) => s.id === selectedSeriesId) ?? null
  const seriesCharacters = (characters ?? [])
    .filter((c) => c.series_id === selectedSeriesId)
    .map((c) => ({ ...c, seriesName: selectedSeries?.name ?? null }))

  const selectedCharacter =
    seriesCharacters.find((c) => c.id === selectedCharacterId) ?? null
  const characterOutfits = (outfits ?? [])
    .filter((o) => o.character_id === selectedCharacterId)
    .map((o) => ({ ...o, characterName: selectedCharacter?.name ?? null }))

  const selectedOutfit = characterOutfits.find((o) => o.id === selectedOutfitId) ?? null

  const locationMap = Object.fromEntries((locations ?? []).map((l) => [l.id, l.name]))
  const unassignedItems = (items ?? []).filter(
    (i) => i.series_id === selectedSeriesId && i.character_id === null,
  )

  const referencedByOutfit = new Set(characterOutfits.flatMap((o) => o.items.map((i) => i.id)))
  const characterUnassignedItems = (items ?? []).filter(
    (i) => i.character_id === selectedCharacterId && !referencedByOutfit.has(i.id),
  )

  function openSeries(id: number) {
    setSelectedSeriesId(id)
    stack.open("series")
  }

  return (
    <>
      <SectionShell
        section="series"
        title="Series"
        isLoading={isLoading}
        error={error}
      >
        {(search, view) => {
          const filtered = (data ?? []).filter((s) =>
            s.name.toLowerCase().includes(search.toLowerCase()),
          )
          if (!filtered.length) {
            return (
              <Text c="dimmed">
                {search ? "No matches found." : "No series added yet."}
              </Text>
            )
          }
          if (view === "table") {
            return (
              <VirtualTable
                rows={filtered}
                columns={[
                  {
                    header: "Name",
                    width: "70%",
                    render: (s) =>
                      editingId === s.id ? (
                        <TextInput
                          value={editingName}
                          onChange={(e) =>
                            setEditingName(e.currentTarget.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleTableSave(s)
                            if (e.key === "Escape") setEditingId(null)
                          }}
                          size="xs"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        s.name
                      ),
                  },
                  {
                    header: "Actions",
                    width: 120,
                    render: (s) =>
                      editingId === s.id ? (
                        <ActionIcon.Group>
                          <ActionIcon
                            variant="light"
                            color="green"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTableSave(s)
                            }}
                          >
                            <IconCheck size={20} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="gray"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingId(null)
                            }}
                          >
                            <IconX size={20} />
                          </ActionIcon>
                        </ActionIcon.Group>
                      ) : (
                        <ActionIcon.Group>
                          <ActionIcon
                            variant="light"
                            onClick={(e) => {
                              e.stopPropagation()
                              openSeries(s.id)
                            }}
                            aria-label="View series"
                          >
                            <IconEye size={20} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="green"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingId(s.id)
                              setEditingName(s.name)
                            }}
                          >
                            <IconPencil size={20} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmDeleteSeries(s)
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
              renderItem={(s) => (
                <SeriesCard
                  key={s.id}
                  series={s}
                  onClick={() => openSeries(s.id)}
                />
              )}
            />
          )
        }}
      </SectionShell>

      <Modal
        opened={confirmDeleteSeries !== null}
        onClose={() => setConfirmDeleteSeries(null)}
        title="Delete Series"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Are you sure you want to delete{" "}
            <strong>{confirmDeleteSeries?.name}</strong>?
          </Text>
          <Group justify="flex-end">
            <Button
              onClick={() => setConfirmDeleteSeries(null)}
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

      <Drawer.Stack>
        <Drawer
          {...seriesReg}
          onClose={() => {
            stack.close("series")
            setSelectedSeriesId(null)
          }}
          title={selectedSeries?.name}
          position="bottom"
          size="70%"
        >
          {seriesCharacters.length === 0 ? (
            <Text c="dimmed">No characters detected for this series.</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
              {seriesCharacters.map((c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
                  onClick={() => {
                    setSelectedCharacterId(c.id)
                    stack.open("character-outfits")
                  }}
                />
              ))}
            </SimpleGrid>
          )}
          {unassignedItems.length > 0 && (
            <>
              <Title order={5} mt="xl" mb="xs">Unassigned Items</Title>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Location</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {unassignedItems.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>{item.name}</Table.Td>
                      <Table.Td>
                        {item.location_id ? (locationMap[item.location_id] ?? "—") : "—"}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </>
          )}
        </Drawer>

        <Drawer
          {...characterReg}
          onClose={() => {
            stack.close("character-outfits")
            setSelectedCharacterId(null)
          }}
          title={
            selectedSeries && selectedCharacter
              ? `${selectedSeries.name} - ${selectedCharacter.name}`
              : selectedCharacter?.name
          }
          position="bottom"
          size="70%"
          transitionProps={{ duration: seriesReg.opened ? 0 : undefined }}
        >
          {characterOutfits.length === 0 ? (
            <Text c="dimmed">No outfits associated with this character.</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
              {characterOutfits.map((o) => (
                <OutfitCard
                  key={o.id}
                  outfit={o}
                  onClick={() => {
                    setSelectedOutfitId(o.id)
                    stack.open("outfit-items")
                  }}
                />
              ))}
            </SimpleGrid>
          )}
          {characterUnassignedItems.length > 0 && (
            <>
              <Title order={5} mt="xl" mb="xs">Unassigned Items</Title>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Location</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {characterUnassignedItems.map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>{item.name}</Table.Td>
                      <Table.Td>
                        {item.location_id ? (locationMap[item.location_id] ?? "—") : "—"}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </>
          )}
        </Drawer>
        <OutfitItemsDrawer
          {...outfitItemsReg}
          outfit={selectedOutfit}
          onClose={() => {
            stack.close("outfit-items")
            setSelectedOutfitId(null)
          }}
        />
      </Drawer.Stack>
    </>
  )
}
