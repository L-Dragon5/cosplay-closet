import { SimpleGrid, Text } from "@mantine/core"
import { useSeriesQuery } from "@/frontend/queries"
import { SectionShell } from "../SectionShell"
import { SeriesCard } from "./SeriesCard"

export function SeriesSection() {
	const { data, isLoading, error } = useSeriesQuery()
	return (
		<SectionShell title="Series" isLoading={isLoading} error={error}>
			{!data?.length ? (
				<Text c="dimmed">No series added yet.</Text>
			) : (
				<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
					{data.map((s) => (
						<SeriesCard key={s.id} series={s} />
					))}
				</SimpleGrid>
			)}
		</SectionShell>
	)
}
