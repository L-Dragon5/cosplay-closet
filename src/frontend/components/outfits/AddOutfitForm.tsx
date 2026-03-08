import { Button, MultiSelect, Select, Stack, TextInput } from "@mantine/core"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "@/frontend/api"
import { useCharactersQuery, useItemsQuery } from "@/frontend/queries"

export function AddOutfitForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const { data: characters } = useCharactersQuery()
  const { data: items } = useItemsQuery()

  const [name, setName] = useState("")
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [itemIds, setItemIds] = useState<string[]>([])

  const characterOptions = (characters ?? []).map((c) => ({
    value: String(c.id),
    label: c.name,
  }))

  const itemOptions = (items ?? []).map((i) => ({
    value: String(i.id),
    label: i.name,
  }))

  async function handleSubmit() {
    if (!name.trim()) return
    await api.outfits.post({
      name: name.trim(),
      character_id: characterId ? Number(characterId) : null,
      item_ids: itemIds.map(Number),
    })
    await queryClient.invalidateQueries({ queryKey: ["outfits"] })
    onSuccess()
  }

  return (
    <Stack>
      <TextInput
        label="Name"
        placeholder="Outfit name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        autoFocus
        required
      />
      <Select
        label="Character"
        placeholder="Select character"
        data={characterOptions}
        value={characterId}
        onChange={setCharacterId}
        clearable
        searchable
      />
      <MultiSelect
        label="Items"
        placeholder="Select items"
        data={itemOptions}
        value={itemIds}
        onChange={setItemIds}
        searchable
      />
      <Button onClick={handleSubmit} disabled={!name.trim()}>
        Add Outfit
      </Button>
    </Stack>
  )
}
