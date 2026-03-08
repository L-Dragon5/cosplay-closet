import { SimpleGrid, Text } from "@mantine/core"
import { useMemo } from "react"
import {
	useCharactersQuery,
	useItemsQuery,
	useSeriesQuery,
} from "@/frontend/queries"
import { SectionShell } from "../SectionShell"
import { ItemCard } from "./ItemCard"

export function ItemsSection() {
	const { data: items, isLoading: iLoading, error: iError } = useItemsQuery()
	const {
		data: characters,
		isLoading: cLoading,
		error: cError,
	} = useCharactersQuery()
	const { data: series, isLoading: sLoading, error: sError } = useSeriesQuery()

	const data = useMemo(
		() =>
			items?.map((item) => ({
				...item,
				characterName:
					characters?.find((c) => c.id === item.character_id)?.name ?? null,
				seriesName: series?.find((s) => s.id === item.series_id)?.name ?? null,
			})),
		[items, characters, series],
	)

	return (
		<SectionShell
			title="Items"
			isLoading={iLoading || cLoading || sLoading}
			error={iError ?? cError ?? sError}
		>
			{!data?.length ? (
				<Text c="dimmed">No items added yet.</Text>
			) : (
				<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
					{data.map((item) => (
						<ItemCard key={item.id} item={item} />
					))}
				</SimpleGrid>
			)}
		</SectionShell>
	)
}
