import "@mantine/core/styles.css"
import { ActionIcon, createTheme, Drawer, MantineProvider, Modal } from "@mantine/core"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"

// Import the generated route tree
import { routeTree } from "./routeTree.gen"

// Mantine theme override
const theme = createTheme({
  components: {
    ActionIcon: ActionIcon.extend({
      defaultProps: {
        size: 'lg',
      },
    }),
    Drawer: Drawer.extend({
      styles: {
        title: { fontSize: "1.5rem", fontWeight: 700 },
      }
    }),
    Modal: Modal.extend({
      styles: {
        title: { fontSize: '1.5rem', fontWeight: 700 },
      },
    }),
  },
})

const queryClient = new QueryClient()

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

export function App() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <RouterProvider router={router} />
        </MantineProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

export default App
