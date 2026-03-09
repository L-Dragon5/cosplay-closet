import "@mantine/core/styles.css"
import {
  ActionIcon,
  Autocomplete,
  createTheme,
  Drawer,
  MantineProvider,
  Modal,
  MultiSelect,
  Select,
} from "@mantine/core"
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
        size: "lg",
      },
    }),
    Drawer: Drawer.extend({
      styles: {
        title: { fontSize: "1.5rem", fontWeight: 700 },
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        zIndex: 400,
      },
      styles: {
        title: { fontSize: "1.5rem", fontWeight: 700 },
      },
    }),
    Select: Select.extend({
      defaultProps: {
        comboboxProps: { zIndex: 500 },
      },
    }),
    MultiSelect: MultiSelect.extend({
      defaultProps: {
        comboboxProps: { zIndex: 500 },
      },
    }),
    Autocomplete: Autocomplete.extend({
      defaultProps: {
        comboboxProps: { zIndex: 500 },
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
