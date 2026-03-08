import { Drawer, SimpleGrid, Text, useDrawersStack } from "@mantine/core"
import { useMemo, useState } from "react"
import { useOutfitsQuery } from "@/frontend/queries"
import { OutfitCard } from "../outfits/OutfitCard"
import { OutfitItemsDrawer } from "../outfits/OutfitItemsDrawer"

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
  const stack = useDrawersStack(["character-outfits", "outfit-items"])
  const characterReg = stack.register("character-outfits")
  const outfitItemsReg = stack.register("outfit-items")
  const [selectedOutfit, setSelectedOutfit] = useState<any | null>(null)

  const characterOutfits = useMemo(
    () =>
      (outfits ?? [])
        .filter((o) => o.character_id === characterId)
        .map((o) => ({ ...o, characterName: characterName ?? null })),
    [outfits, characterId, characterName],
  )

  return (
    <Drawer.Stack>
      <Drawer
        {...characterReg}
        opened={characterId !== null}
        onClose={() => {
          stack.closeAll()
          onClose()
        }}
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
              <OutfitCard
                key={o.id}
                outfit={o}
                onClick={() => {
                  setSelectedOutfit(o)
                  stack.open("outfit-items")
                }}
              />
            ))}
          </SimpleGrid>
        )}
      </Drawer>

      <OutfitItemsDrawer
        {...outfitItemsReg}
        outfit={selectedOutfit}
        onClose={() => {
          stack.close("outfit-items")
          setSelectedOutfit(null)
        }}
      />
    </Drawer.Stack>
  )
}
