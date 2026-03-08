import { useQuery } from "@tanstack/react-query"
import { api } from "@/frontend/api"

export function useSeriesQuery() {
  return useQuery({
    queryKey: ["series"],
    queryFn: async () => {
      const { data } = await api.series.get()
      return data!
    },
  })
}

export function useCharactersQuery() {
  return useQuery({
    queryKey: ["characters"],
    queryFn: async () => {
      const { data } = await api.characters.get()
      return data!
    },
  })
}

export function useItemsQuery() {
  return useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data } = await api.items.get()
      return data!
    },
  })
}

export function useOutfitsQuery() {
  return useQuery({
    queryKey: ["outfits"],
    queryFn: async () => {
      const { data } = await api.outfits.get()
      return data!
    },
  })
}

export function useLocationsQuery() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await api.locations.get()
      return data!
    },
  })
}
