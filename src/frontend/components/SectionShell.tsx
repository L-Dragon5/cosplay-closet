import {
  ActionIcon,
  Center,
  Container,
  Group,
  Loader,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core"
import { useDebouncedValue } from "@mantine/hooks"
import { IconLayoutGrid, IconList, IconSearch } from "@tabler/icons-react"
import { useAtom } from "jotai"
import { useState } from "react"
import type { Section } from "@/frontend/atoms"
import { sectionViewAtom } from "@/frontend/atoms"

export type ViewMode = "card" | "table"

export function SectionShell({
  section,
  title,
  isLoading,
  error,
  filterSlot,
  children,
}: {
  section: Section
  title: string
  isLoading: boolean
  error: Error | null
  filterSlot?: React.ReactNode
  children: (search: string, view: ViewMode) => React.ReactNode
}) {
  const [search, setSearch] = useState("")
  const [debounced] = useDebouncedValue(search, 100)
  const [sectionView, setSectionView] = useAtom(sectionViewAtom)
  const view = sectionView[section]

  function setView(mode: ViewMode) {
    setSectionView((prev) => ({ ...prev, [section]: mode }))
  }

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
        <Group justify="space-between" align="center" mb="sm">
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
          </Group>
        </Group>
        <TextInput
          placeholder={`Search ${title.toLowerCase()}…`}
          leftSection={<IconSearch size={20} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          mb={filterSlot ? "sm" : 0}
        />
        {filterSlot}
      </Container>

      <Container size="xl" py="xl">
        {children(debounced, view)}
      </Container>
    </>
  )
}
