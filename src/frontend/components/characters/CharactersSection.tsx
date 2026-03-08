import { ActionIcon, Button, Group, Modal, Stack, Text } from "@mantine/core"
import { IconEye, IconPencil, IconTrash, IconX } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import type { Character } from "@/backend/characters/model"
import { api } from "@/frontend/api"
import { useCharactersQuery, useSeriesQuery } from "@/frontend/queries"
import { SectionShell } from "../SectionShell"
import { VirtualCardGrid } from "../VirtualCardGrid"
import { VirtualTable } from "../VirtualTable"
import { CharacterCard } from "./CharacterCard"
import { CharacterOutfitsDrawer } from "./CharacterOutfitsDrawer"
import { EditCharacterForm } from "./EditCharacterForm"

export function CharactersSection() {
  const {
    data: characters,
    isLoading: cLoading,
    error: cError,
  } = useCharactersQuery()
  const { data: series, isLoading: sLoading, error: sError } = useSeriesQuery()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(
    null,
  )
  const [confirmDeleteCharacter, setConfirmDeleteCharacter] =
    useState<Character | null>(null)

  const data = useMemo(
    () =>
      characters?.map((c) => ({
        ...c,
        seriesName: series?.find((s) => s.id === c.series_id)?.name ?? null,
      })),
    [characters, series],
  )

  const selectedCharacter = data?.find((c) => c.id === selectedId) ?? null

  async function handleTableDelete() {
    if (!confirmDeleteCharacter) return
    await api.characters({ id: confirmDeleteCharacter.id }).delete()
    await queryClient.invalidateQueries({ queryKey: ["characters"] })
    setConfirmDeleteCharacter(null)
  }

  return (
    <>
      <SectionShell
        section="characters"
        title="Characters"
        isLoading={cLoading || sLoading}
        error={cError ?? sError}
      >
        {(search, view) => {
          const filtered = (data ?? []).filter((c) =>
            c.name.toLowerCase().includes(search.toLowerCase()),
          )
          if (!filtered.length) {
            return (
              <Text c="dimmed">
                {search ? "No matches found." : "No characters added yet."}
              </Text>
            )
          }
          if (view === "table") {
            return (
              <VirtualTable
                rows={filtered}
                columns={[
                  { header: "Name", render: (c) => c.name },
                  { header: "Series", render: (c) => c.seriesName ?? "—" },
                  {
                    header: "Actions",
                    render: (c) => (
                      <ActionIcon.Group>
                        <ActionIcon
                          variant="light"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedId(c.id)
                          }}
                          aria-label="View character"
                        >
                          <IconEye size={20} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="green"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingCharacter(c)
                          }}
                        >
                          <IconPencil size={20} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDeleteCharacter(c)
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
              renderItem={(c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
                  onClick={() => setSelectedId(c.id)}
                />
              )}
            />
          )
        }}
      </SectionShell>

      <Modal
        opened={editingCharacter !== null}
        onClose={() => setEditingCharacter(null)}
        title="Edit Character"
        centered
      >
        {editingCharacter && (
          <EditCharacterForm
            character={editingCharacter}
            onSuccess={() => setEditingCharacter(null)}
          />
        )}
      </Modal>

      <Modal
        opened={confirmDeleteCharacter !== null}
        onClose={() => setConfirmDeleteCharacter(null)}
        title="Delete Character"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Are you sure you want to delete{" "}
            <strong>{confirmDeleteCharacter?.name}</strong>?
          </Text>
          <Group justify="flex-end">
            <Button
              onClick={() => setConfirmDeleteCharacter(null)}
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
      </Modal>

      <CharacterOutfitsDrawer
        characterId={selectedId}
        characterName={selectedCharacter?.name ?? null}
        seriesName={selectedCharacter?.seriesName ?? null}
        onClose={() => setSelectedId(null)}
      />
    </>
  )
}
