import {StrictMode} from "react"

import {createRoot} from "react-dom/client"

import {App} from "./App"
import "@mantine/core/styles.css"
import "@mantine/notifications/styles.css"
import "./assets/main.css"

const container = document.getElementById("root")
if (!container) {
  throw new Error("root element not found")
}
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
