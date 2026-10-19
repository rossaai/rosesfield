import { defineProject } from "vitest/config"

export default defineProject({
  test: {
    name: "gateway-worker",
    include: ["test/worker/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
