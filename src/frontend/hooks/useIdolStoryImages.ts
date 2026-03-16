import { useDebouncedValue } from "@mantine/hooks"
import { useQuery } from "@tanstack/react-query"

const STALE_TIME = 10 * 60 * 1000

export function useIdolStoryImages(characterName: string | null) {
  const [debouncedCharacter] = useDebouncedValue(characterName, 400)

  return useQuery({
    queryKey: ["idolstory", "images", debouncedCharacter],
    enabled: !!debouncedCharacter,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedCharacter) params.set("name", debouncedCharacter)
      const res = await fetch(`/api/idolstory?${params}`)
      if (!res.ok) return []
      const data = (await res.json()) as {
        images: { label: string; imageUrl: string }[]
      }
      return data.images.map((img) => ({
        title: img.label,
        imageUrl: `/api/proxy-image?url=${encodeURIComponent(img.imageUrl)}`,
      }))
    },
  })
}
