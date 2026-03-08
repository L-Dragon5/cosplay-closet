import { Button, Stack, TextInput } from "@mantine/core"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "@/frontend/api"

export function AddLocationForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState("")

  async function handleSubmit() {
    if (!name.trim()) return
    await api.locations.post({ name: name.trim() })
    await queryClient.invalidateQueries({ queryKey: ["locations"] })
    onSuccess()
  }

  return (
    <Stack>
      <TextInput
        label="Name"
        placeholder="Location name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        autoFocus
        required
      />
      <Button onClick={handleSubmit} disabled={!name.trim()}>
        Add Location
      </Button>
    </Stack>
  )
}
