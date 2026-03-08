import { useDebouncedValue } from "@mantine/hooks"
import { useQuery } from "@tanstack/react-query"

const JIKAN_BASE = "https://api.jikan.moe/v4"
const STALE_TIME = 10 * 60 * 1000

function normalizeJikanName(raw: string): string {
  const commaIdx = raw.indexOf(",")
  if (commaIdx === -1) return raw
  const last = raw.slice(0, commaIdx).trim()
  const first = raw.slice(commaIdx + 1).trim()
  return first ? `${first} ${last}` : last
}

export function useJikanCharacters(seriesName: string | null) {
  const [debouncedSeriesName] = useDebouncedValue(seriesName, 400)

  const animeQuery = useQuery({
    queryKey: ["jikan", "anime", debouncedSeriesName],
    enabled: !!debouncedSeriesName,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const res = await fetch(
        `${JIKAN_BASE}/anime?q=${encodeURIComponent(debouncedSeriesName!)}&limit=1`,
      )
      if (!res.ok) throw new Error("Jikan anime search failed")
      const json = await res.json()
      return (json.data?.[0]?.mal_id as number) ?? null
    },
  })

  const charactersQuery = useQuery({
    queryKey: ["jikan", "characters", animeQuery.data],
    enabled: !!animeQuery.data,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const res = await fetch(`${JIKAN_BASE}/anime/${animeQuery.data}/characters`)
      if (!res.ok) throw new Error("Jikan characters fetch failed")
      const json = await res.json()
      return (json.data as { character: { name: string } }[]).map((entry) =>
        normalizeJikanName(entry.character.name),
      )
    },
  })

  return {
    names: charactersQuery.data ?? [],
    isLoading: animeQuery.isFetching || charactersQuery.isFetching,
  }
}

export function useJikanCharacterImages(characterName: string | null) {
  const [debouncedName] = useDebouncedValue(characterName, 400)

  return useQuery({
    queryKey: ["jikan", "character-images", debouncedName],
    enabled: !!debouncedName,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const res = await fetch(
        `${JIKAN_BASE}/characters?q=${encodeURIComponent(debouncedName!)}&limit=3`,
      )
      if (!res.ok) throw new Error("Jikan character search failed")
      const json = await res.json()
      return (
        json.data as {
          mal_id: number
          name: string
          images: { jpg: { image_url: string } }
        }[]
      ).map((c) => ({
        malId: c.mal_id,
        title: normalizeJikanName(c.name),
        imageUrl: c.images.jpg.image_url,
      }))
    },
  })
}

export function useJikanSeriesImages(seriesName: string | null) {
  const [debouncedName] = useDebouncedValue(seriesName, 400)

  return useQuery({
    queryKey: ["jikan", "series-images", debouncedName],
    enabled: !!debouncedName,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const res = await fetch(
        `${JIKAN_BASE}/anime?q=${encodeURIComponent(debouncedName!)}&limit=3`,
      )
      if (!res.ok) throw new Error("Jikan anime search failed")
      const json = await res.json()
      return (
        json.data as {
          mal_id: number
          title: string
          images: { jpg: { large_image_url: string } }
        }[]
      ).map((a) => ({
        malId: a.mal_id,
        title: a.title,
        imageUrl: a.images.jpg.large_image_url,
      }))
    },
  })
}
