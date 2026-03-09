import { Drawer, SimpleGrid, Table, Text, Title, useDrawersStack } from "@mantine/core"
import { useMemo, useState } from "react"
import { useItemsQuery, useLocationsQuery, useOutfitsQuery } from "@/frontend/queries"
import { OutfitCard } from "../outfits/OutfitCard"
import { OutfitItemsDrawer } from "../outfits/OutfitItemsDrawer"

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
  const { data: outfits } = useOutfitsQuery()
  const { data: items } = useItemsQuery()
  const { data: locations } = useLocationsQuery()
  const stack = useDrawersStack(["character-outfits", "outfit-items"])
  const characterReg = stack.register("character-outfits")
  const outfitItemsReg = stack.register("outfit-items")
  const [selectedOutfit, setSelectedOutfit] = useState<any | null>(null)

  const locationMap = useMemo(
    () => Object.fromEntries((locations ?? []).map((l) => [l.id, l.name])),
    [locations],
  )

  const characterOutfits = useMemo(
    () =>
      (outfits ?? [])
        .filter((o) => o.character_id === characterId)
        .map((o) => ({ ...o, characterName: characterName ?? null })),
    [outfits, characterId, characterName],
  )

  const unassignedItems = useMemo(() => {
    const referencedIds = new Set(
      characterOutfits.flatMap((o) => o.items.map((i) => i.id)),
    )
    return (items ?? []).filter(
      (i) => i.character_id === characterId && !referencedIds.has(i.id),
    )
  }, [items, characterId, characterOutfits])

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
        {characterOutfits.length === 0 ? (
          <Text c="dimmed">No outfit versions associated with this character.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
            {characterOutfits.map((o) => (
              <OutfitCard
                key={o.id}
                outfit={o}
                onClick={() => {
                  setSelectedOutfit(o)
                  stack.open("outfit-items")
                }}
              />
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
