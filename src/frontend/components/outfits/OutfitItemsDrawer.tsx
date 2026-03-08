import { Drawer, Table, Text } from "@mantine/core"
import { useLocationsQuery } from "@/frontend/queries"

type OutfitLike = {
  id: number
  name: string
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

  const locationMap = Object.fromEntries(
    (locations ?? []).map((l) => [l.id, l.name]),
  )

  return (
    <Drawer
      {...drawerProps}
      opened={outfit !== null}
      onClose={onClose}
      title={outfit ? (outfit.characterName ? `${outfit.characterName} - ${outfit.name}` : outfit.name) : undefined}
      position="bottom"
      size="50%"
      closeOnClickOutside={false}
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
    </Drawer>
  )
}
