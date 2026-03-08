import { Drawer, SimpleGrid, Text } from "@mantine/core"
import { useMemo } from "react"
import { useOutfitsQuery } from "@/frontend/queries"
import { OutfitCard } from "../outfits/OutfitCard"

export function CharacterOutfitsDrawer({
  characterId,
  characterName,
  seriesName,
  onClose,
}: {
  characterId: number | null
  characterName: string | null
  seriesName: string | null
  onClose: () => void
}) {
  const { data: outfits } = useOutfitsQuery()

  const characterOutfits = useMemo(
    () =>
      (outfits ?? [])
        .filter((o) => o.character_id === characterId)
        .map((o) => ({ ...o, characterName: characterName ?? null })),
    [outfits, characterId, characterName],
  )

  return (
    <Drawer
      opened={characterId !== null}
      onClose={onClose}
      title={seriesName ? `${seriesName} - ${characterName}` : characterName}
      position="bottom"
      size="70%"
      closeOnClickOutside={false}
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
  )
}
