import { AppShell, Button, Group, Text } from "@mantine/core"
import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { useAtom } from "jotai"
import { activeSectionAtom, type Section } from "@/frontend/atoms"

function NavButton({ section, label }: { section: Section; label: string }) {
	const [activeSection, setActiveSection] = useAtom(activeSectionAtom)
	return (
		<Button
			variant={activeSection === section ? "light" : "subtle"}
			size="sm"
			onClick={() => setActiveSection(section)}
		>
			{label}
		</Button>
	)
}

const RootLayout = () => (
	<AppShell header={{ height: 60 }} padding="md">
		<AppShell.Header>
			<Group h="100%" px="md" justify="space-between">
				<Text fw={700} size="lg">
					Cosplay Closet
				</Text>
				<Group gap="xs">
					<NavButton section="series" label="Series" />
					<NavButton section="characters" label="Characters" />
					<NavButton section="items" label="Items" />
					<NavButton section="outfits" label="Outfits" />
				</Group>
			</Group>
		</AppShell.Header>
		<AppShell.Main>
			<Outlet />
			<TanStackRouterDevtools />
		</AppShell.Main>
	</AppShell>
)

export const Route = createRootRoute({ component: RootLayout })
