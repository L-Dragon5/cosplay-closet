import {
  Accordion,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Stack,
  Table,
  Text,
} from "@mantine/core"
import { useQueryClient } from "@tanstack/react-query"
import { type ReactNode, useCallback, useEffect, useState } from "react"
import type { SyncPlan } from "@/backend/docsync/plan"
import type { ApplyResult } from "@/backend/docsync/service"
import { AppModal } from "@/frontend/components/AppModal"

// Preview what the Bin List doc would change, then apply exactly that plan.
// The server refuses (409) if the doc or the data moved in between.
export function DocSyncModal({
  opened,
  onClose,
}: {
  opened: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [plan, setPlan] = useState<SyncPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApplyResult | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPlan(null)
    try {
      const res = await fetch("/api/docsync")
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setPlan(body)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (opened) load()
  }, [opened, load])

  function close() {
    if (applying) return
    setPlan(null)
    setError(null)
    setResult(null)
    onClose()
  }

  async function handleApply() {
    if (!plan) return
    setApplying(true)
    setError(null)
    try {
      const res = await fetch("/api/docsync/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: plan.hash }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setResult(body)
      await queryClient.invalidateQueries()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setApplying(false)
    }
  }

  const changes = plan
    ? plan.moves.length + plan.renames.length + plan.adds.length
    : 0

  return (
    <AppModal
      opened={opened}
      onClose={close}
      title="Sync from Bin List"
      size="xl"
      centered
    >
      {result ? (
        <Stack>
          <Alert color="green" title="Synced">
            {result.moved} moved, {result.renamed} renamed, {result.added} added
            ({result.newLocations} new locations, {result.newSeries} new
            series). The data from before is saved on the server as{" "}
            <code>{result.backup}</code>.
          </Alert>
          <Group justify="flex-end">
            <Button onClick={close}>Done</Button>
          </Group>
        </Stack>
      ) : (
        <Stack>
          {loading && (
            <Group>
              <Loader size="sm" />
              <Text size="sm">Reading the doc…</Text>
            </Group>
          )}
          {error && (
            <Alert color="red" title="Sync failed">
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {error}
              </Text>
            </Alert>
          )}
          {plan && (
            <>
              <Text size="sm" c="dimmed">
                {plan.entries} lines in the doc. Items that are only in the app
                are listed, never deleted.
              </Text>
              <Accordion multiple variant="separated">
                <Section
                  value="moves"
                  label="Move"
                  count={plan.moves.length}
                  head={["Item", "From", "To"]}
                  rows={plan.moves.map((m) => [
                    m.name,
                    m.from ?? "—",
                    <NewTag
                      key="to"
                      text={m.to}
                      isNew={m.locationId === null}
                    />,
                  ])}
                />
                <Section
                  value="renames"
                  label="Rename"
                  count={plan.renames.length}
                  head={["In the app", "In the doc"]}
                  rows={plan.renames.map((r) => [r.from, r.to])}
                />
                <Section
                  value="adds"
                  label="Add"
                  count={plan.adds.length}
                  head={["Item", "Series", "Character", "Type", "Location"]}
                  rows={plan.adds.map((a) => [
                    a.name,
                    a.series ? (
                      <NewTag
                        key="s"
                        text={a.series}
                        isNew={a.seriesId === null}
                      />
                    ) : (
                      "—"
                    ),
                    a.character ?? "—",
                    a.type,
                    <NewTag
                      key="l"
                      text={a.location}
                      isNew={a.locationId === null}
                    />,
                  ])}
                />
                <Section
                  value="notInDoc"
                  label="Only in the app (left alone)"
                  count={plan.notInDoc.length}
                  head={["Item", "Location"]}
                  rows={plan.notInDoc.map((n) => [n.name, n.location ?? "—"])}
                />
              </Accordion>
            </>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close} disabled={applying}>
              Cancel
            </Button>
            {error && !loading && (
              <Button variant="light" onClick={load} disabled={applying}>
                Preview again
              </Button>
            )}
            <Button
              onClick={handleApply}
              disabled={!plan || changes === 0}
              loading={applying}
            >
              {plan && changes === 0 ? "Already in sync" : "Apply"}
            </Button>
          </Group>
        </Stack>
      )}
    </AppModal>
  )
}

function NewTag({ text, isNew }: { text: string; isNew: boolean }) {
  return (
    <Group gap={4} wrap="nowrap">
      <span>{text}</span>
      {isNew && (
        <Badge size="xs" variant="light">
          new
        </Badge>
      )}
    </Group>
  )
}

function Section({
  value,
  label,
  count,
  head,
  rows,
}: {
  value: string
  label: string
  count: number
  head: string[]
  rows: ReactNode[][]
}) {
  return (
    <Accordion.Item value={value}>
      <Accordion.Control disabled={count === 0}>
        <Group gap="xs">
          <Text fw={500}>{label}</Text>
          <Badge variant="light" color={count ? "indigo" : "gray"}>
            {count}
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Table striped fz="sm">
          <Table.Thead>
            <Table.Tr>
              {head.map((h) => (
                <Table.Th key={h}>{h}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((cells, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are static per plan
              <Table.Tr key={i}>
                {cells.map((c, j) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed columns
                  <Table.Td key={j}>{c}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Accordion.Panel>
    </Accordion.Item>
  )
}
