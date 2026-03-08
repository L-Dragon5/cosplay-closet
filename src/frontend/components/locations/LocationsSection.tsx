import { List, Modal, SimpleGrid, Text, Title } from "@mantine/core"
import { useMemo, useState } from "react"
import { useItemsQuery, useLocationsQuery } from "@/frontend/queries"
import { SectionShell } from "../SectionShell"
import { LocationCard } from "./LocationCard"

export function LocationsSection() {
  const {
    data: locations,
    isLoading: lLoading,
    error: lError,
  } = useLocationsQuery()
  const { data: items, isLoading: iLoading, error: iError } = useItemsQuery()
  const [selectedId, setSelectedId] = useState<number | null>(null)

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

  return (
    <>
      <SectionShell
        title="Locations"
        isLoading={lLoading || iLoading}
        error={lError ?? iError}
      >
        {!data?.length ? (
          <Text c="dimmed">No locations added yet.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
            {data.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                itemCount={location.itemCount}
                onClick={() => setSelectedId(location.id)}
              />
            ))}
          </SimpleGrid>
        )}
      </SectionShell>

      <Modal
        opened={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={<Title order={3}>{selectedLocation?.name}</Title>}
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
