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
