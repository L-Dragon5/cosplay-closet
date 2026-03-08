import {
  ActionIcon,
  Button,
  Center,
  Collapse,
  Container,
  Group,
  Loader,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core"
import { useDebouncedValue } from "@mantine/hooks"
import { IconFilter, IconLayoutGrid, IconList, IconSearch } from "@tabler/icons-react"
import { useState } from "react"

export type ViewMode = "card" | "table"

export function SectionShell({
  title,
  isLoading,
  error,
  children,
}: {
  title: string
  isLoading: boolean
  error: Error | null
  children: (search: string, view: ViewMode) => React.ReactNode
}) {
  const [search, setSearch] = useState("")
  const [debounced] = useDebouncedValue(search, 100)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState<ViewMode>("card")

  if (isLoading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    )
  }
  if (error) {
    return (
      <Center h={300}>
        <Text c="red">{error.message}</Text>
      </Center>
    )
  }

  return (
    <>
      <Container
        size="xl"
        style={{
          position: "sticky",
          top: 60,
          zIndex: 10,
          backgroundColor: "var(--mantine-color-body)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
        py="md"
      >
        <Group justify="space-between" align="center" mb={filtersOpen ? "sm" : 0}>
          <Title>{title}</Title>
          <Group gap="xs">
            <Tooltip label="Card view">
              <ActionIcon
                variant={view === "card" ? "light" : "subtle"}
                onClick={() => setView("card")}
                aria-label="Card view"
              >
                <IconLayoutGrid size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Table view">
              <ActionIcon
                variant={view === "table" ? "light" : "subtle"}
                onClick={() => setView("table")}
                aria-label="Table view"
              >
                <IconList size={18} />
              </ActionIcon>
            </Tooltip>
            <Button
              variant={filtersOpen ? "light" : "subtle"}
              leftSection={<IconFilter size={16} />}
              onClick={() => {
                setFiltersOpen((o) => !o)
                if (filtersOpen) setSearch("")
              }}
            >
              Filters
            </Button>
          </Group>
        </Group>
        <Collapse in={filtersOpen}>
          <TextInput
            placeholder={`Search ${title.toLowerCase()}…`}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            mb="xs"
          />
        </Collapse>
      </Container>

      <Container size="xl" py="xl">
        {children(debounced, view)}
      </Container>
    </>
  )
}
