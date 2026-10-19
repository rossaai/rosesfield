import { defineProject } from "vitest/config"

export default defineProject({
  test: {
    name: "generation",
    include: ["test/**/*.test.ts"],
  },
})
