import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core"

const TYPE_COLORS: Record<string, string> = {
  Clothes: "blue",
  Wig: "pink",
  Shoes: "orange",
  Accessories: "yellow",
  Prop: "gray",
  Materials: "teal",
}

export function ItemCard({ item }: { item: any }) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="xs">
        <Title order={4}>{item.name}</Title>
        <Group gap="xs">
          <Badge color={TYPE_COLORS[item.type] ?? "gray"} variant="light">
            {item.type}
          </Badge>
          {item.seriesName && (
            <Badge color="indigo" variant="outline">
              {item.seriesName}
            </Badge>
          )}
        </Group>
        {item.characterName && (
          <Text size="sm" c="dimmed">
            {item.characterName}
          </Text>
        )}
        {item.locationName && (
          <Text size="sm" c="dimmed">
            {item.locationName}
          </Text>
        )}
      </Stack>
    </Card>
  )
}
