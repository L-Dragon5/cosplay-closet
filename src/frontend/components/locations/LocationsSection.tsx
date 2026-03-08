import {
  ActionIcon,
  Button,
  Group,
  List,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core"
import { IconCheck, IconEye, IconPencil, IconTrash, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import type { Location } from "@/backend/locations/model"
import { api } from "@/frontend/api"
import { useItemsQuery, useLocationsQuery } from "@/frontend/queries"
import { SectionShell } from "../SectionShell"
import { VirtualCardGrid } from "../VirtualCardGrid"
import { VirtualTable } from "../VirtualTable"
import { LocationCard } from "./LocationCard"

export function LocationsSection() {
  const {
    data: locations,
    isLoading: lLoading,
    error: lError,
  } = useLocationsQuery()
  const { data: items, isLoading: iLoading, error: iError } = useItemsQuery()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [confirmDeleteLocation, setConfirmDeleteLocation] =
    useState<Location | null>(null)

  const data = useMemo(
    () =>
      locations?.map((location) => ({
        ...location,
        itemCount:
          items?.filter((i) => i.location_id === location.id).length ?? 0,
      })),
    [locations, items],
  )

  const selectedLocation = data?.find((l) => l.id === selectedId) ?? null
  const locationItems = useMemo(
    () => (items ?? []).filter((i) => i.location_id === selectedId),
    [items, selectedId],
  )

  async function handleTableSave(location: Location) {
    const trimmed = editingName.trim()
    if (!trimmed || trimmed === location.name) {
      setEditingId(null)
      return
    }
    await api.locations({ id: location.id }).put({ name: trimmed })
    await queryClient.invalidateQueries({ queryKey: ["locations"] })
    setEditingId(null)
  }

  async function handleTableDelete() {
    if (!confirmDeleteLocation) return
    await api.locations({ id: confirmDeleteLocation.id }).delete()
    await queryClient.invalidateQueries({ queryKey: ["locations"] })
    setConfirmDeleteLocation(null)
  }

  return (
    <>
      <SectionShell
        section="locations"
        title="Locations"
        isLoading={lLoading || iLoading}
        error={lError ?? iError}
      >
        {(search, view) => {
          const filtered = (data ?? []).filter((l) =>
            l.name.toLowerCase().includes(search.toLowerCase()),
          )
          if (!filtered.length) {
            return (
              <Text c="dimmed">
                {search ? "No matches found." : "No locations added yet."}
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
                    render: (l) =>
                      editingId === l.id ? (
                        <TextInput
                          value={editingName}
                          onChange={(e) =>
                            setEditingName(e.currentTarget.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleTableSave(l)
                            if (e.key === "Escape") setEditingId(null)
                          }}
                          size="xs"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        l.name
                      ),
                  },
                  { header: "Items", render: (l) => l.itemCount },
                  {
                    header: "Actions",
                    render: (l) =>
                      editingId === l.id ? (
                        <ActionIcon.Group>
                          <ActionIcon
                            variant="light"
                            color="green"
                            onClick={(e) => { e.stopPropagation(); handleTableSave(l) }}
                          >
                            <IconCheck size={20} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="gray"
                            onClick={(e) => { e.stopPropagation(); setEditingId(null) }}
                          >
                            <IconX size={20} />
                          </ActionIcon>
                        </ActionIcon.Group>
                      ) : (
                        <ActionIcon.Group>
                          <ActionIcon
                            variant="light"
                            onClick={(e) => { e.stopPropagation(); setSelectedId(l.id) }}
                            aria-label="View location"
                          >
                            <IconEye size={20} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="green"
                            onClick={(e) => { e.stopPropagation(); setEditingId(l.id); setEditingName(l.name) }}
                          >
                            <IconPencil size={20} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteLocation(l) }}
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
              renderItem={(location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  itemCount={location.itemCount}
                  onClick={() => setSelectedId(location.id)}
                />
              )}
            />
          )
        }}
      </SectionShell>

      <Modal
        opened={confirmDeleteLocation !== null}
        onClose={() => setConfirmDeleteLocation(null)}
        title="Delete Location"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Are you sure you want to delete{" "}
            <strong>{confirmDeleteLocation?.name}</strong>?
          </Text>
          <Group justify="flex-end">
            <Button
              onClick={() => setConfirmDeleteLocation(null)}
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

      <Modal
        opened={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={selectedLocation?.name}
        centered
      >
        {locationItems.length === 0 ? (
          <Text c="dimmed">No items in this location.</Text>
        ) : (
          <List>
            {locationItems.map((item) => (
              <List.Item key={item.id}>{item.name}</List.Item>
            ))}
          </List>
        )}
      </Modal>
    </>
  )
}
