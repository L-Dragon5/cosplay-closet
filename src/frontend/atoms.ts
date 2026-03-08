import { atomWithStorage } from "jotai/utils"

export type Section = "outfits" | "series" | "characters" | "items"

export const activeSectionAtom = atomWithStorage<Section>(
	"activeSection",
	"outfits",
)
