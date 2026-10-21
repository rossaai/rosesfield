import react from "@vitejs/plugin-react"
import { defineProject } from "vitest/config"

export default defineProject({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: "platform",
    include: ["test/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    testTimeout: 15_000,
  },
})
