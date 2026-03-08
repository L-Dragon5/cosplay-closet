import {
  ActionIcon,
  Button,
  Card,
  Group,
  Image,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core"
import {
  IconCamera,
  IconCheck,
  IconPencil,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { api } from "@/frontend/api"
import { ImageCropper } from "../ImageCropper"

export function SeriesCard({
  series,
  onClick,
}: {
  series: any
  onClick: () => void
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(series.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [uploadOpened, setUploadOpened] = useState(false)

  async function handleSave() {
    if (!name.trim() || name === series.name) {
      setEditing(false)
      setName(series.name)
      return
    }
    await api.series({ id: series.id }).put({ name: name.trim() })
    await queryClient.invalidateQueries({ queryKey: ["series"] })
    setEditing(false)
  }

  async function handleDelete() {
    await api.series({ id: series.id }).delete()
    await queryClient.invalidateQueries({ queryKey: ["series"] })
    setConfirmDelete(false)
  }

  function handleCancel() {
    setName(series.name)
    setEditing(false)
  }

  return (
    <>
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={{ cursor: editing ? "default" : "pointer" }}
        onClick={editing ? undefined : onClick}
      >
        {series.image_path && (
          <Card.Section style={{ position: "relative" }}>
            <Image src={series.image_path} height={160} fit="cover" style={{ pointerEvents: "none" }} />
            <ActionIcon
              style={{ position: "absolute", top: 8, right: 8 }}
              variant="filled"
              color="dark"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setUploadOpened(true)
              }}
              aria-label="Change image"
            >
              <IconCamera size={14} />
            </ActionIcon>
          </Card.Section>
        )}

        {editing ? (
          <Group gap="xs" wrap="nowrap" mt={series.image_path ? "md" : 0}>
            <TextInput
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
                if (e.key === "Escape") handleCancel()
              }}
              size="sm"
              style={{ flex: 1 }}
              autoFocus
            />
            <ActionIcon.Group>
              <ActionIcon variant="light" color="green" onClick={handleSave}>
                <IconCheck size={20} />
              </ActionIcon>
              <ActionIcon variant="light" color="gray" onClick={handleCancel}>
                <IconX size={20} />
              </ActionIcon>
            </ActionIcon.Group>
          </Group>
        ) : (
          <Group justify="space-between" wrap="nowrap" mt={series.image_path ? "md" : 0}>
            {series.image_path ? (
              <Text size="sm" c="dimmed" fw={500}>{series.name}</Text>
            ) : (
              <Title order={4}>{series.name}</Title>
            )}
            <ActionIcon.Group>
              {!series.image_path && (
                <ActionIcon
                  variant="light"
                  onClick={(e) => {
                    e.stopPropagation()
                    setUploadOpened(true)
                  }}
                  aria-label="Add image"
                >
                  <IconCamera size={20} />
                </ActionIcon>
              )}
              <ActionIcon
                variant="light"
                color="green"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditing(true)
                }}
              >
                <IconPencil size={20} />
              </ActionIcon>
              <ActionIcon
                variant="light"
                color="red"
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmDelete(true)
                }}
              >
                <IconTrash size={20} />
              </ActionIcon>
            </ActionIcon.Group>
          </Group>
        )}
      </Card>

      <Modal
        opened={uploadOpened}
        onClose={() => setUploadOpened(false)}
        title={`${series.image_path ? "Change" : "Add"} Image — ${series.name}`}
        centered
        size="lg"
      >
        <ImageCropper
          uploadUrl={`/api/series/${series.id}/image`}
          queryKey="series"
          onSuccess={() => setUploadOpened(false)}
          jikanSearchName={series.name}
        />
      </Modal>

      <Modal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Series"
        centered
        size="sm"
      >
        <Stack>
          <Text>
            Are you sure you want to delete <strong>{series.name}</strong>?
          </Text>
          <Group justify="flex-end">
            <Button
              onClick={() => setConfirmDelete(false)}
              leftSection={<IconX size={20} />}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="red"
              onClick={handleDelete}
              leftSection={<IconTrash size={20} />}
            >
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
