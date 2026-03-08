import { Badge, Card, Group, Stack, Title } from "@mantine/core"

export function OutfitCard({ outfit }: { outfit: any }) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="xs">
        <Title order={4}>{outfit.name}</Title>
        <Group gap="xs">
          <Badge color="teal" variant="light">
            {outfit.items.length} {outfit.items.length === 1 ? "item" : "items"}
          </Badge>
          {outfit.characterName && (
            <Badge color="violet" variant="light">
              {outfit.characterName}
            </Badge>
          )}
        </Group>
      </Stack>
    </Card>
  )
}
