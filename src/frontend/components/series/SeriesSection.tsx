import { Drawer, SimpleGrid, Text, useDrawersStack } from "@mantine/core"
import { useState } from "react"
import {
  useCharactersQuery,
  useOutfitsQuery,
  useSeriesQuery,
} from "@/frontend/queries"
import { CharacterCard } from "../characters/CharacterCard"
import { OutfitCard } from "../outfits/OutfitCard"
import { SectionShell } from "../SectionShell"
import { VirtualCardGrid } from "../VirtualCardGrid"
import { VirtualTable } from "../VirtualTable"
import { SeriesCard } from "./SeriesCard"

export function SeriesSection() {
  const stack = useDrawersStack(["series", "character-outfits"])
  const seriesReg = stack.register("series")
  const characterReg = stack.register("character-outfits")
  const { data, isLoading, error } = useSeriesQuery()
  const { data: characters } = useCharactersQuery()
  const { data: outfits } = useOutfitsQuery()
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null)
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null)

  const selectedSeries = data?.find((s) => s.id === selectedSeriesId) ?? null
  const seriesCharacters = (characters ?? [])
    .filter((c) => c.series_id === selectedSeriesId)
    .map((c) => ({ ...c, seriesName: selectedSeries?.name ?? null }))

  const selectedCharacter = seriesCharacters.find((c) => c.id === selectedCharacterId) ?? null
  const characterOutfits = (outfits ?? [])
    .filter((o) => o.character_id === selectedCharacterId)
    .map((o) => ({ ...o, characterName: selectedCharacter?.name ?? null }))

  function openSeries(id: number) {
    setSelectedSeriesId(id)
    stack.open("series")
  }

  return (
    <>
      <SectionShell title="Series" isLoading={isLoading} error={error}>
        {(search, view) => {
          const filtered = (data ?? []).filter((s) =>
            s.name.toLowerCase().includes(search.toLowerCase()),
          )
          if (!filtered.length) {
            return <Text c="dimmed">{search ? "No matches found." : "No series added yet."}</Text>
          }
          if (view === "table") {
            return (
              <VirtualTable
                rows={filtered}
                columns={[{ header: "Name", render: (s) => s.name }]}
                onRowClick={(s) => openSeries(s.id)}
              />
            )
          }
          return (
            <VirtualCardGrid
              items={filtered}
              renderItem={(s) => <SeriesCard key={s.id} series={s} onClick={() => openSeries(s.id)} />}
            />
          )
        }}
      </SectionShell>

      <Drawer.Stack>
        <Drawer
          {...seriesReg}
          onClose={() => { stack.close("series"); setSelectedSeriesId(null) }}
          title={selectedSeries?.name}
          position="bottom"
          size="70%"
          closeOnClickOutside={false}
        >
          {seriesCharacters.length === 0 ? (
            <Text c="dimmed">No characters detected for this series.</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
              {seriesCharacters.map((c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
                  onClick={() => { setSelectedCharacterId(c.id); stack.open("character-outfits") }}
                />
              ))}
            </SimpleGrid>
          )}
        </Drawer>

        <Drawer
          {...characterReg}
          onClose={() => { stack.close("character-outfits"); setSelectedCharacterId(null) }}
          title={
            selectedSeries && selectedCharacter
              ? `${selectedSeries.name} - ${selectedCharacter.name}`
              : selectedCharacter?.name
          }
          position="bottom"
          size="70%"
          closeOnClickOutside={false}
          transitionProps={{ duration: seriesReg.opened ? 0 : undefined }}
        >
          {characterOutfits.length === 0 ? (
            <Text c="dimmed">No outfits associated with this character.</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
              {characterOutfits.map((o) => (
                <OutfitCard key={o.id} outfit={o} />
              ))}
            </SimpleGrid>
          )}
        </Drawer>
      </Drawer.Stack>
    </>
  )
}
