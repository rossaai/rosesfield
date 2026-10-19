import { defineProject } from "vitest/config"

export default defineProject({
  test: {
    name: "kernel",
    include: ["test/**/*.test.ts"],
  },
})
