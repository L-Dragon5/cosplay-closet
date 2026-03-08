import { useQuery } from "@tanstack/react-query"
import type { Character } from "@/backend/characters/model"
import type { Item, ItemType } from "@/backend/items/model"
import type { Location } from "@/backend/locations/model"
import type { Outfit } from "@/backend/outfits/model"
import type { Series } from "@/backend/series/model"
import { api } from "@/frontend/api"

export type { Series, Character, Item, ItemType, Location, Outfit }

export function useSeriesQuery() {
  return useQuery({
    queryKey: ["series"],
    queryFn: async () => {
      const { data } = await api.series.get()
      return data as Series[]
    },
  })
}

export function useCharactersQuery() {
  return useQuery({
    queryKey: ["characters"],
    queryFn: async () => {
      const { data } = await api.characters.get()
      return data as Character[]
    },
  })
}

export function useItemsQuery() {
  return useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data } = await api.items.get()
      return data as Item[]
    },
  })
}

export function useOutfitsQuery() {
  return useQuery({
    queryKey: ["outfits"],
    queryFn: async () => {
      const { data } = await api.outfits.get()
      return data as Outfit[]
    },
  })
}

export function useLocationsQuery() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await api.locations.get()
      return data as Location[]
    },
  })
}
