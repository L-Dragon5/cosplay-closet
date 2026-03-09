import { atomWithStorage } from "jotai/utils"
import type { ViewMode } from "@/frontend/components/SectionShell"

export type Section =
  | "outfits"
  | "series"
  | "characters"
  | "items"
  | "locations"

export const activeSectionAtom = atomWithStorage<Section>(
  "activeSection",
  "items",
)

export const sectionViewAtom = atomWithStorage<Record<Section, ViewMode>>(
  "sectionView",
  {
    series: "card",
    characters: "card",
    items: "table",
    locations: "card",
    outfits: "card",
  },
)
