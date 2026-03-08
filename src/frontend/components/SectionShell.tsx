import { Center, Container, Loader, Text, Title } from "@mantine/core"

export function SectionShell({
  title,
  isLoading,
  error,
  children,
}: {
  title: string
  isLoading: boolean
  error: Error | null
  children: React.ReactNode
}) {
  if (isLoading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    )
  }
  if (error) {
    return (
      <Center h={300}>
        <Text c="red">{error.message}</Text>
      </Center>
    )
  }
  return (
    <Container size="xl" py="xl">
      <Title mb="xl">{title}</Title>
      {children}
    </Container>
  )
}
