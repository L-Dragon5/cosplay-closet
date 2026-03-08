import { List, Modal, Text } from "@mantine/core"
import { useMemo, useState } from "react"
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
            return <Text c="dimmed">{search ? "No matches found." : "No locations added yet."}</Text>
          }
          if (view === "table") {
            return (
              <VirtualTable
                rows={filtered}
                columns={[
                  { header: "Name", render: (l) => l.name },
                  { header: "Items", render: (l) => l.itemCount },
                ]}
                onRowClick={(l) => setSelectedId(l.id)}
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
