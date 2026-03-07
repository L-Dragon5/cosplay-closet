import "@mantine/core/styles.css"
import { createTheme, MantineProvider } from "@mantine/core"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"

// Import the generated route tree
import { routeTree } from "./routeTree.gen"

// Mantine theme override
const theme = createTheme({
	/** Put your mantine theme override here */
})

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
			<MantineProvider theme={theme}>
				<RouterProvider router={router} />
			</MantineProvider>
		</StrictMode>
	)
}

export default App
