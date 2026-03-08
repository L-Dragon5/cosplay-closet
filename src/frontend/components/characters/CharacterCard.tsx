import { Badge, Card, Group, Title } from "@mantine/core"

export function CharacterCard({ character }: { character: any }) {
	return (
		<Card shadow="sm" padding="lg" radius="md" withBorder>
			<Title order={4} mb="xs">
				{character.name}
			</Title>
			<Group gap="xs">
				{character.seriesName ? (
					<Badge color="blue" variant="light">
						{character.seriesName}
					</Badge>
				) : (
					<Badge color="gray" variant="light">
						No Series
					</Badge>
				)}
			</Group>
		</Card>
	)
}
