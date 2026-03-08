import { Badge, Card, Group, Title } from "@mantine/core"

export function LocationCard({
  location,
  itemCount,
  onClick,
}: {
  location: any
  itemCount: number
  onClick: () => void
}) {
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <Group justify="space-between" align="flex-start">
        <Title order={4}>{location.name}</Title>
        <Badge size="lg" color="blue" variant="filled">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </Badge>
      </Group>
    </Card>
  )
}
