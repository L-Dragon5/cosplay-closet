import { Button, Stack, TextInput } from "@mantine/core"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "@/frontend/api"

export function AddSeriesForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState("")

  async function handleSubmit() {
    if (!name.trim()) return
    await api.series.post({ name: name.trim() })
    await queryClient.invalidateQueries({ queryKey: ["series"] })
    onSuccess()
  }

  return (
    <Stack>
      <TextInput
        label="Name"
        placeholder="Series name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        autoFocus
        required
      />
      <Button onClick={handleSubmit} disabled={!name.trim()}>
        Add Series
      </Button>
    </Stack>
  )
}
