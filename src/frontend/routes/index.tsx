import { createFileRoute } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { activeSectionAtom } from "@/frontend/atoms"
import { CharactersSection } from "@/frontend/components/characters/CharactersSection"
import { ItemsSection } from "@/frontend/components/items/ItemsSection"
import { LocationsSection } from "@/frontend/components/locations/LocationsSection"
import { OutfitsSection } from "@/frontend/components/outfits/OutfitsSection"
import { SeriesSection } from "@/frontend/components/series/SeriesSection"

export const Route = createFileRoute("/")({
  component: IndexPage,
})

function IndexPage() {
  const section = useAtomValue(activeSectionAtom)
  switch (section) {
    case "series":
      return <SeriesSection />
    case "characters":
      return <CharactersSection />
    case "items":
      return <ItemsSection />
    case "locations":
      return <LocationsSection />
    case "outfits":
      return <OutfitsSection />
  }
}
