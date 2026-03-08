import { Badge, Card, Group, Title } from "@mantine/core"

export function LocationCard({
	location,
	itemCount,
}: {
	location: any
	itemCount: number
}) {
	return (
		<Card shadow="sm" padding="lg" radius="md" withBorder>
			<Group justify="space-between" align="flex-start">
				<Title order={4}>{location.name}</Title>
				<Badge color="gray" variant="light">
					{itemCount} {itemCount === 1 ? "item" : "items"}
				</Badge>
			</Group>
		</Card>
	)
}
