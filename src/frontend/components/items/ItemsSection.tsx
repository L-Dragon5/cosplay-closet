import { Text } from "@mantine/core"
import { useMemo } from "react"
import {
  useCharactersQuery,
  useItemsQuery,
  useLocationsQuery,
  useSeriesQuery,
} from "@/frontend/queries"
import { SectionShell } from "../SectionShell"
import { VirtualCardGrid } from "../VirtualCardGrid"
import { VirtualTable } from "../VirtualTable"
import { ItemCard } from "./ItemCard"

export function ItemsSection() {
  const { data: items, isLoading: iLoading, error: iError } = useItemsQuery()
  const { data: characters, isLoading: cLoading, error: cError } = useCharactersQuery()
  const { data: series, isLoading: sLoading, error: sError } = useSeriesQuery()
  const { data: locations, isLoading: lLoading, error: lError } = useLocationsQuery()

  const data = useMemo(
    () =>
      items?.map((item) => ({
        ...item,
        characterName: characters?.find((c) => c.id === item.character_id)?.name ?? null,
        seriesName: series?.find((s) => s.id === item.series_id)?.name ?? null,
        locationName: locations?.find((l) => l.id === item.location_id)?.name ?? null,
      })),
    [items, characters, series, locations],
  )

  return (
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
          return <Text c="dimmed">{search ? "No matches found." : "No items added yet."}</Text>
        }
        if (view === "table") {
          return (
            <VirtualTable
              rows={filtered}
              columns={[
                { header: "Name", render: (item) => item.name },
                { header: "Type", render: (item) => item.type },
                { header: "Series", render: (item) => item.seriesName ?? "—" },
                { header: "Character", render: (item) => item.characterName ?? "—" },
                { header: "Location", render: (item) => item.locationName ?? "—" },
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
  )
}
