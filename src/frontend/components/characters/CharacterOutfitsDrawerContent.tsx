import { Button, SimpleGrid, Table, Text, Title } from "@mantine/core"
import { IconPlus } from "@tabler/icons-react"
import { useMemo, useState } from "react"
import { AppModal } from "@/frontend/components/AppModal"
import {
  useItemsQuery,
  useLocationsQuery,
  useOutfitsQuery,
} from "@/frontend/queries"
import { AddOutfitForm } from "../outfits/AddOutfitForm"
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
  const [addOpened, setAddOpened] = useState(false)

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
        .map((o) => ({
          ...o,
          characterName: characterName ?? null,
          seriesName: seriesName ?? null,
        })),
    [outfits, characterId, characterName, seriesName],
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

  const referencedIds = useMemo(
    () => new Set(Object.keys(outfitCountById).map(Number)),
    [outfitCountById],
  )

  const characterWigs = useMemo(
    () =>
      (items ?? []).filter(
        (i) =>
          i.character_id === characterId &&
          i.type === "Wig" &&
          (outfitCountById[i.id] ?? 0) !== 1,
      ),
    [items, characterId, outfitCountById],
  )

  const unassignedItems = useMemo(
    () =>
      (items ?? []).filter(
        (i) =>
          i.character_id === characterId &&
          i.type !== "Wig" &&
          !referencedIds.has(i.id),
      ),
    [items, characterId, referencedIds],
  )

  return (
    <>
      <Button
        leftSection={<IconPlus size={16} />}
        variant="light"
        mb="md"
        onClick={() => setAddOpened(true)}
      >
        Add Outfit Version
      </Button>

      {characterOutfits.length === 0 ? (
        <Text c="dimmed">
          No outfit versions associated with this character.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          {characterOutfits.map((o) => (
            <OutfitCard
              key={o.id}
              outfit={o}
              onClick={() => onOutfitClick(o)}
              lockedCharacterId={characterId}
            />
          ))}
        </SimpleGrid>
      )}
      {characterWigs.length > 0 && (
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
      {unassignedItems.length > 0 && (
        <>
          <Title order={5} mt="xl" mb="xs">
            Unassigned Items
          </Title>
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

      <AppModal
        opened={addOpened}
        onClose={() => setAddOpened(false)}
        title="Add Outfit Version"
        centered
      >
        <AddOutfitForm
          lockedCharacterId={characterId}
          onSuccess={() => setAddOpened(false)}
        />
      </AppModal>
    </>
  )
}
