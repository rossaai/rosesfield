import { describe, expect, it } from "vitest"
import { EngineBindingInvalidError } from "#domain/error/engine-binding-invalid.error"
import { resolveBinding, selectBinding } from "#domain/select-binding"
import {
  chosenModelOf,
  graphTaskOf,
  hostedModelOf,
  isHostedModelId,
  taskBinding,
  tasksOf,
} from "#domain/task-binding"

const open = { adapter: "engine-a", config: { graph: "open" } }
const other = { adapter: "engine-a", config: { graph: "other" } }
const graphs = selectBinding({ input: "model", options: { open, other } })
const imageTask = taskBinding({
  tasks: ["text-to-image"],
  input: "model",
  default: "open",
  fallback: graphs,
})

describe("a task binding", () => {
  it("resolves a hosted model id to the hosted model binding", () => {
    const binding = resolveBinding(imageTask, { model: "maker/model-1.5" })
    expect(hostedModelOf(binding)).toBe("maker/model-1.5")
  })

  it("resolves a graph id through its fallback", () => {
    expect(resolveBinding(imageTask, { model: "other" })).toEqual(other)
  })

  it("resolves no model to the default", () => {
    expect(resolveBinding(imageTask, {})).toEqual(open)
    expect(chosenModelOf(imageTask, {})).toBe("open")
  })

  it("starts from a hosted default when the app opens on one", () => {
    const hostedFirst = taskBinding({
      tasks: ["text-to-image"],
      input: "model",
      default: "maker/model",
      fallback: graphs,
    })
    expect(hostedModelOf(resolveBinding(hostedFirst, {}))).toBe("maker/model")
  })

  it("names the tasks it lists", () => {
    expect(tasksOf(imageTask)).toEqual(["text-to-image"])
    expect(tasksOf(open)).toEqual([])
  })

  it("names the task of each graph it declares, and none for the rest", () => {
    const audioTask = taskBinding({
      tasks: ["speech"],
      input: "model",
      default: "open",
      fallback: graphs,
      graphTasks: { open: "speech", other: "music" },
    })
    expect(graphTaskOf(audioTask, "open")).toBe("speech")
    expect(graphTaskOf(audioTask, "other")).toBe("music")
    expect(graphTaskOf(audioTask, "toString")).toBeNull()
    expect(graphTaskOf(imageTask, "open")).toBeNull()
    expect(graphTaskOf(open, "open")).toBeNull()
  })

  it("refuses a task binding with no fallback", () => {
    const broken = { adapter: "task", config: { tasks: [], input: "model" } }
    expect(() => resolveBinding(broken, {})).toThrow(EngineBindingInvalidError)
  })

  it.each([
    ["maker/model", true],
    ["maker/model-2.5_turbo", true],
    ["model", false],
    ["maker/", false],
    ["/model", false],
    ["maker/model/extra", false],
  ])("reads %s as a hosted model id: %s", (value, expected) => {
    expect(isHostedModelId(value)).toBe(expected)
  })
})
