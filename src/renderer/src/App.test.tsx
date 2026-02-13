import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import App from "./App"

describe("app", () => {
  it("renders the heading", () => {
    render(<App />)

    expect(screen.getByRole("heading", { name: /money hero/i })).toBeInTheDocument()
  })
})
