import { Drawer, Table, Text, Title } from "@mantine/core"
import { useMemo } from "react"
import {
  useItemsQuery,
  useLocationsQuery,
  useOutfitsQuery,
} from "@/frontend/queries"

type OutfitLike = {
  id: number
  name: string
  character_id: number | null
  characterName?: string | null
  items: { id: number; name: string; location_id: number | null }[]
}

export function OutfitItemsDrawer({
  outfit,
  onClose,
  ...drawerProps
}: {
  outfit: OutfitLike | null
  onClose: () => void
  [key: string]: any
}) {
  const { data: locations } = useLocationsQuery()
  const { data: items } = useItemsQuery()
  const { data: outfits } = useOutfitsQuery()

  const locationMap = Object.fromEntries(
    (locations ?? []).map((l) => [l.id, l.name]),
  )

  const characterOutfits = useMemo(
    () =>
      (outfits ?? []).filter((o) => o.character_id === outfit?.character_id),
    [outfits, outfit?.character_id],
  )

  const outfitCountById = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const o of characterOutfits) {
      for (const i of o.items) {
        counts[i.id] = (counts[i.id] ?? 0) + 1
      }
    }
    return counts
  }, [characterOutfits])

  const characterWigs = useMemo(
    () =>
      (items ?? []).filter(
        (i) =>
          i.character_id === outfit?.character_id &&
          i.type === "Wig" &&
          (outfitCountById[i.id] ?? 0) !== 1,
      ),
    [items, outfit?.character_id, outfitCountById],
  )

  return (
    <Drawer
      {...drawerProps}
      opened={outfit !== null}
      onClose={onClose}
      title={
        outfit
          ? outfit.characterName
            ? `${outfit.characterName} - ${outfit.name}`
            : outfit.name
          : undefined
      }
      position="bottom"
      size="50%"
    >
      {outfit?.items.length === 0 ? (
        <Text c="dimmed">No items in this outfit.</Text>
      ) : (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Location</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {outfit?.items.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.name}</Table.Td>
                <Table.Td>
                  {item.location_id
                    ? (locationMap[item.location_id] ?? "—")
                    : "—"}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      {characterWigs.length > 0 &&
        !outfit?.items.some(
          (oi) => (items ?? []).find((i) => i.id === oi.id)?.type === "Wig",
        ) && (
          <>
            <Title order={5} mt="xl" mb="xs">
              Character Wigs
            </Title>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Location</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {characterWigs.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{item.name}</Table.Td>
                    <Table.Td>
                      {item.location_id
                        ? (locationMap[item.location_id] ?? "—")
                        : "—"}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </>
        )}
    </Drawer>
  )
}
