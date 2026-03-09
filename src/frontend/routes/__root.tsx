import { AppShell, Button, Group, Text } from "@mantine/core"
import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { useAtom } from "jotai"
import { activeSectionAtom, type Section } from "@/frontend/atoms"
import { AddButton } from "@/frontend/components/AddButton"

function NavButton({ section, label }: { section: Section; label: string }) {
  const [activeSection, setActiveSection] = useAtom(activeSectionAtom)
  return (
    <Button
      variant={activeSection === section ? "filled" : "light"}
      color="indigo"
      size="sm"
      onClick={() => setActiveSection(section)}
    >
      {label}
    </Button>
  )
}

const RootLayout = () => (
  <AppShell header={{ height: 60 }} padding="md">
    <AppShell.Header style={{ backgroundColor: "pink" }}>
      <Group h="100%" px="md" justify="space-between">
        <Text fw={700} size="lg">
          Cosplay Closet
        </Text>
        <Group gap="xs">
          <NavButton section="series" label="Series" />
          <NavButton section="characters" label="Characters" />
          <NavButton section="items" label="Items" />
          <NavButton section="locations" label="Locations" />
          <NavButton section="outfits" label="Outfit Versions" />
        </Group>
      </Group>
    </AppShell.Header>
    <AppShell.Main>
      <Outlet />
      <AddButton />
      <TanStackRouterDevtools />
    </AppShell.Main>
  </AppShell>
)

export const Route = createRootRoute({ component: RootLayout })
