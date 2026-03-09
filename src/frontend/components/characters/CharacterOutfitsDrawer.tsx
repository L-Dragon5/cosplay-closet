import { Drawer, useDrawersStack } from "@mantine/core"
import { useState } from "react"
import { OutfitItemsDrawer } from "../outfits/OutfitItemsDrawer"
import { CharacterOutfitsDrawerContent } from "./CharacterOutfitsDrawerContent"

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
  const stack = useDrawersStack(["character-outfits", "outfit-items"])
  const characterReg = stack.register("character-outfits")
  const outfitItemsReg = stack.register("outfit-items")
  const [selectedOutfit, setSelectedOutfit] = useState<any | null>(null)

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
      >
        <CharacterOutfitsDrawerContent
          characterId={characterId}
          characterName={characterName}
          seriesName={seriesName}
          onOutfitClick={(o) => {
            setSelectedOutfit(o)
            stack.open("outfit-items")
          }}
        />
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
