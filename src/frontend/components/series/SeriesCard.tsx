import { Card, Title } from "@mantine/core"

export function SeriesCard({ series }: { series: any }) {
	return (
		<Card shadow="sm" padding="lg" radius="md" withBorder>
			<Title order={4}>{series.name}</Title>
		</Card>
	)
}
