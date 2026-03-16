import { ActionIcon, Button, Group, Stack, Text } from "@mantine/core"
import { IconEye, IconPencil, IconTrash, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import type { Outfit } from "@/backend/outfits/model"
import { api } from "@/frontend/api"
import { AppModal } from "@/frontend/components/AppModal"
import {
  useCharactersQuery,
  useOutfitsQuery,
  useSeriesQuery,
} from "@/frontend/queries"
import { SectionShell } from "../SectionShell"
import { VirtualCardGrid } from "../VirtualCardGrid"
import { VirtualTable } from "../VirtualTable"
import { EditOutfitForm } from "./EditOutfitForm"
import { OutfitCard } from "./OutfitCard"
import { OutfitItemsDrawer } from "./OutfitItemsDrawer"

export function OutfitsSection() {
  const {
    data: outfits,
    isLoading: oLoading,
    error: oError,
  } = useOutfitsQuery()
  const {
    data: characters,
    isLoading: cLoading,
    error: cError,
  } = useCharactersQuery()
  const { data: series } = useSeriesQuery()
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null)
  const [confirmDeleteOutfit, setConfirmDeleteOutfit] = useState<Outfit | null>(
    null,
  )

  const data = useMemo(
    () =>
      outfits?.map((o) => {
        const character = characters?.find((c) => c.id === o.character_id)
        return {
          ...o,
          characterName: character?.name ?? null,
          seriesName:
            series?.find((s) => s.id === character?.series_id)?.name ?? null,
        }
      }),
    [outfits, characters, series],
  )

  const selectedOutfit = data?.find((o) => o.id === selectedId) ?? null

  async function handleTableDelete() {
    if (!confirmDeleteOutfit) return
    await api.outfits({ id: confirmDeleteOutfit.id }).delete()
    await queryClient.invalidateQueries({ queryKey: ["outfits"] })
    setConfirmDeleteOutfit(null)
  }

  return (
    <>
      <SectionShell
        section="outfits"
        title="Outfit Versions"
        isLoading={oLoading || cLoading}
        error={oError ?? cError}
      >
        {(search, view) => {
          const q = search.toLowerCase()
          const filtered = (data ?? []).filter(
            (o) =>
              o.name.toLowerCase().includes(q) ||
              (o.characterName?.toLowerCase().includes(q) ?? false),
          )
          if (!filtered.length) {
            return (
              <Text c="dimmed">
                {search ? "No matches found." : "No outfit versions added yet."}
              </Text>
            )
          }
          if (view === "table") {
            return (
              <VirtualTable
                rows={filtered}
                columns={[
                  { header: "Name", width: "40%", render: (o) => o.name },
                  {
                    header: "Character",
                    width: "35%",
                    render: (o) => o.characterName ?? "—",
                  },
                  { header: "Items", width: 80, render: (o) => o.items.length },
                  {
                    header: "Actions",
                    width: 120,
                    render: (o) => (
                      <ActionIcon.Group>
                        <ActionIcon
                          variant="light"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedId(o.id)
                          }}
                          aria-label="View outfit version"
                        >
                          <IconEye size={20} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="green"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingOutfit(o)
                          }}
                        >
                          <IconPencil size={20} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDeleteOutfit(o)
                          }}
                        >
                          <IconTrash size={20} />
                        </ActionIcon>
                      </ActionIcon.Group>
                    ),
                  },
                ]}
              />
            )
          }
          return (
            <VirtualCardGrid
              items={filtered}
              renderItem={(o) => (
                <OutfitCard
                  key={o.id}
                  outfit={o}
                  onClick={() => setSelectedId(o.id)}
                />
              )}
            />
          )
        }}
      </SectionShell>

      <OutfitItemsDrawer
        outfit={selectedOutfit}
        onClose={() => setSelectedId(null)}
      />

      <AppModal
        opened={editingOutfit !== null}
        onClose={() => setEditingOutfit(null)}
        title="Edit Outfit Version"
        centered
      >
        {editingOutfit && (
          <EditOutfitForm
            outfit={editingOutfit}
            onSuccess={() => setEditingOutfit(null)}
          />
        )}
      </AppModal>

      <AppModal
        opened={confirmDeleteOutfit !== null}
        onClose={() => setConfirmDeleteOutfit(null)}
        title="Delete Outfit Version"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Are you sure you want to delete{" "}
            <strong>{confirmDeleteOutfit?.name}</strong>?
          </Text>
          <Group justify="flex-end">
            <Button
              onClick={() => setConfirmDeleteOutfit(null)}
              leftSection={<IconX size={20} />}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="red"
              onClick={handleTableDelete}
              leftSection={<IconTrash size={20} />}
            >
              Confirm
            </Button>
          </Group>
        </Stack>
      </AppModal>
    </>
  )
}
