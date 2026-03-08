import { Text } from "@mantine/core"
import { useMemo } from "react"
import { useCharactersQuery, useOutfitsQuery } from "@/frontend/queries"
import { SectionShell } from "../SectionShell"
import { VirtualCardGrid } from "../VirtualCardGrid"
import { VirtualTable } from "../VirtualTable"
import { OutfitCard } from "./OutfitCard"

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

  const data = useMemo(
    () =>
      outfits?.map((o) => ({
        ...o,
        characterName:
          characters?.find((c) => c.id === o.character_id)?.name ?? null,
      })),
    [outfits, characters],
  )

  return (
    <SectionShell
      title="Outfits"
      isLoading={oLoading || cLoading}
      error={oError ?? cError}
    >
      {(search, view) => {
        const filtered = (data ?? []).filter((o) =>
          o.name.toLowerCase().includes(search.toLowerCase()),
        )
        if (!filtered.length) {
          return <Text c="dimmed">{search ? "No matches found." : "No outfits added yet."}</Text>
        }
        if (view === "table") {
          return (
            <VirtualTable
              rows={filtered}
              columns={[
                { header: "Name", render: (o) => o.name },
                { header: "Character", render: (o) => o.characterName ?? "—" },
                { header: "Items", render: (o) => o.items.length },
              ]}
            />
          )
        }
        return (
          <VirtualCardGrid
            items={filtered}
            renderItem={(o) => <OutfitCard key={o.id} outfit={o} />}
          />
        )
      }}
    </SectionShell>
  )
}
