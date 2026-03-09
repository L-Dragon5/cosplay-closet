import { SimpleGrid, Table, Text, Title } from "@mantine/core"
import { useMemo } from "react"
import { useItemsQuery, useLocationsQuery, useOutfitsQuery } from "@/frontend/queries"
import { OutfitCard } from "../outfits/OutfitCard"

export function CharacterOutfitsDrawerContent({
  characterId,
  characterName,
  seriesName,
  onOutfitClick,
}: {
  characterId: number | null
  characterName: string | null
  seriesName: string | null
  onOutfitClick: (outfit: any) => void
}) {
  const { data: outfits } = useOutfitsQuery()
  const { data: items } = useItemsQuery()
  const { data: locations } = useLocationsQuery()

  const locationMap = useMemo(
    () => Object.fromEntries((locations ?? []).map((l) => [l.id, l.name])),
    [locations],
  )

  const characterOutfits = useMemo(
    () =>
      (outfits ?? [])
        .filter((o) => o.character_id === characterId)
        .map((o) => ({ ...o, characterName: characterName ?? null, seriesName: seriesName ?? null })),
    [outfits, characterId, characterName, seriesName],
  )

  const referencedIds = useMemo(
    () => new Set(characterOutfits.flatMap((o) => o.items.map((i) => i.id))),
    [characterOutfits],
  )

  const unassignedItems = useMemo(
    () =>
      (items ?? []).filter(
        (i) => i.character_id === characterId && !referencedIds.has(i.id),
      ),
    [items, characterId, referencedIds],
  )

  return (
    <>
      {characterOutfits.length === 0 ? (
        <Text c="dimmed">No outfit versions associated with this character.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          {characterOutfits.map((o) => (
            <OutfitCard key={o.id} outfit={o} onClick={() => onOutfitClick(o)} />
          ))}
        </SimpleGrid>
      )}
      {unassignedItems.length > 0 && (
        <>
          <Title order={5} mt="xl" mb="xs">Unassigned Items</Title>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Location</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {unassignedItems.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>{item.name}</Table.Td>
                  <Table.Td>
                    {item.location_id ? (locationMap[item.location_id] ?? "—") : "—"}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}
    </>
  )
}
