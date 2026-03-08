import { Text } from "@mantine/core"
import { useMemo, useState } from "react"
import { useCharactersQuery, useSeriesQuery } from "@/frontend/queries"
import { SectionShell } from "../SectionShell"
import { VirtualCardGrid } from "../VirtualCardGrid"
import { VirtualTable } from "../VirtualTable"
import { CharacterCard } from "./CharacterCard"
import { CharacterOutfitsDrawer } from "./CharacterOutfitsDrawer"

export function CharactersSection() {
  const { data: characters, isLoading: cLoading, error: cError } = useCharactersQuery()
  const { data: series, isLoading: sLoading, error: sError } = useSeriesQuery()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const data = useMemo(
    () =>
      characters?.map((c) => ({
        ...c,
        seriesName: series?.find((s) => s.id === c.series_id)?.name ?? null,
      })),
    [characters, series],
  )

  const selectedCharacter = data?.find((c) => c.id === selectedId) ?? null

  return (
    <>
      <SectionShell
        title="Characters"
        isLoading={cLoading || sLoading}
        error={cError ?? sError}
      >
        {(search, view) => {
          const filtered = (data ?? []).filter((c) =>
            c.name.toLowerCase().includes(search.toLowerCase()),
          )
          if (!filtered.length) {
            return <Text c="dimmed">{search ? "No matches found." : "No characters added yet."}</Text>
          }
          if (view === "table") {
            return (
              <VirtualTable
                rows={filtered}
                columns={[
                  { header: "Name", render: (c) => c.name },
                  { header: "Series", render: (c) => c.seriesName ?? "—" },
                ]}
                onRowClick={(c) => setSelectedId(c.id)}
              />
            )
          }
          return (
            <VirtualCardGrid
              items={filtered}
              renderItem={(c) => (
                <CharacterCard key={c.id} character={c} onClick={() => setSelectedId(c.id)} />
              )}
            />
          )
        }}
      </SectionShell>

      <CharacterOutfitsDrawer
        characterId={selectedId}
        characterName={selectedCharacter?.name ?? null}
        seriesName={selectedCharacter?.seriesName ?? null}
        onClose={() => setSelectedId(null)}
      />
    </>
  )
}
