import { Drawer, SimpleGrid, Text, Title, useDrawersStack } from "@mantine/core"
import { useState } from "react"
import {
  useCharactersQuery,
  useOutfitsQuery,
  useSeriesQuery,
} from "@/frontend/queries"
import { CharacterCard } from "../characters/CharacterCard"
import { OutfitCard } from "../outfits/OutfitCard"
import { SectionShell } from "../SectionShell"
import { SeriesCard } from "./SeriesCard"

export function SeriesSection() {
  const stack = useDrawersStack(["series", "character-outfits"])
  const seriesReg = stack.register("series")
  const characterReg = stack.register("character-outfits")
  const { data, isLoading, error } = useSeriesQuery()
  const { data: characters } = useCharactersQuery()
  const { data: outfits } = useOutfitsQuery()
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null)
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(
    null,
  )

  const selectedSeries = data?.find((s) => s.id === selectedSeriesId) ?? null
  const seriesCharacters = (characters ?? [])
    .filter((c) => c.series_id === selectedSeriesId)
    .map((c) => ({ ...c, seriesName: selectedSeries?.name ?? null }))

  const selectedCharacter =
    seriesCharacters.find((c) => c.id === selectedCharacterId) ?? null
  const characterOutfits = (outfits ?? [])
    .filter((o) => o.character_id === selectedCharacterId)
    .map((o) => ({ ...o, characterName: selectedCharacter?.name ?? null }))

  return (
    <>
      <SectionShell title="Series" isLoading={isLoading} error={error}>
        {!data?.length ? (
          <Text c="dimmed">No series added yet.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
            {data.map((s) => (
              <SeriesCard
                key={s.id}
                series={s}
                onClick={() => {
                  setSelectedSeriesId(s.id)
                  stack.open("series")
                }}
              />
            ))}
          </SimpleGrid>
        )}
      </SectionShell>

      <Drawer.Stack>
        <Drawer
          {...seriesReg}
          onClose={() => {
            stack.close("series")
            setSelectedSeriesId(null)
          }}
          title={<Title order={3}>{selectedSeries?.name}</Title>}
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
                  onClick={() => {
                    setSelectedCharacterId(c.id)
                    stack.open("character-outfits")
                  }}
                />
              ))}
            </SimpleGrid>
          )}
        </Drawer>

        <Drawer
          {...characterReg}
          onClose={() => {
            stack.close("character-outfits")
            setSelectedCharacterId(null)
          }}
          title={
            <Title order={3}>
              {selectedSeries && selectedCharacter
                ? `${selectedSeries.name} - ${selectedCharacter.name}`
                : selectedCharacter?.name}
            </Title>
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
