import { SimpleGrid, Text } from "@mantine/core"
import { useMemo } from "react"
import { useItemsQuery, useLocationsQuery } from "@/frontend/queries"
import { SectionShell } from "../SectionShell"
import { LocationCard } from "./LocationCard"

export function LocationsSection() {
	const {
		data: locations,
		isLoading: lLoading,
		error: lError,
	} = useLocationsQuery()
	const { data: items, isLoading: iLoading, error: iError } = useItemsQuery()

	const data = useMemo(
		() =>
			locations?.map((location) => ({
				...location,
				itemCount:
					items?.filter((i) => i.location_id === location.id).length ?? 0,
			})),
		[locations, items],
	)

	return (
		<SectionShell
			title="Locations"
			isLoading={lLoading || iLoading}
			error={lError ?? iError}
		>
			{!data?.length ? (
				<Text c="dimmed">No locations added yet.</Text>
			) : (
				<SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
					{data.map((location) => (
						<LocationCard
							key={location.id}
							location={location}
							itemCount={location.itemCount}
						/>
					))}
				</SimpleGrid>
			)}
		</SectionShell>
	)
}
