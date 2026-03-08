import { SimpleGrid, Text } from "@mantine/core"
import { useMemo } from "react"
import { useCharactersQuery, useOutfitsQuery } from "@/frontend/queries"
import { SectionShell } from "../SectionShell"
import { OutfitCard } from "./OutfitCard"

export function OutfitsSection() {
  const {
    data: outfits,
    isLoading: oLoading,
    error: oError,
  } = useOutfitsQuery()
  const {
    data: characters,
    isLoading: cLoading,
    error: cError,
  } = useCharactersQuery()

  const data = useMemo(
    () =>
      outfits?.map((o) => ({
        ...o,
        characterName:
          characters?.find((c) => c.id === o.character_id)?.name ?? null,
      })),
    [outfits, characters],
  )

  return (
    <SectionShell
      title="Outfits"
      isLoading={oLoading || cLoading}
      error={oError ?? cError}
    >
      {!data?.length ? (
        <Text c="dimmed">No outfits added yet.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          {data.map((o) => (
            <OutfitCard key={o.id} outfit={o} />
          ))}
        </SimpleGrid>
      )}
    </SectionShell>
  )
}
