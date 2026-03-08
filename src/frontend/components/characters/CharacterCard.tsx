import { Badge, Card, Group, Title } from "@mantine/core"

export function CharacterCard({
  character,
  onClick,
}: {
  character: any
  onClick?: () => void
}) {
  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={onClick ? { cursor: "pointer" } : undefined}
      onClick={onClick}
    >
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
