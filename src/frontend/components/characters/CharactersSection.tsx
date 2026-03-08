import { SimpleGrid, Text } from "@mantine/core"
import { useMemo, useState } from "react"
import { useCharactersQuery, useSeriesQuery } from "@/frontend/queries"
import { SectionShell } from "../SectionShell"
import { CharacterCard } from "./CharacterCard"
import { CharacterOutfitsDrawer } from "./CharacterOutfitsDrawer"

export function CharactersSection() {
  const {
    data: characters,
    isLoading: cLoading,
    error: cError,
  } = useCharactersQuery()
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
        {!data?.length ? (
          <Text c="dimmed">No characters added yet.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
            {data.map((c) => (
              <CharacterCard
                key={c.id}
                character={c}
                onClick={() => setSelectedId(c.id)}
              />
            ))}
          </SimpleGrid>
        )}
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
