import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { renderWorkflows, syncWorkflows } from "../../scripts/workflows-sync"

let source = ""

afterEach(() => {
  rmSync(source, { recursive: true, force: true })
})

function fresh(): string {
  source = mkdtempSync(join(tmpdir(), "rosesfield-workflows-"))
  writeFileSync(join(source, "README.md"), "")
  return join(source, "workflows.gen.ts")
}

function folder(id: string, files: string[]): void {
  mkdirSync(join(source, id), { recursive: true })
  for (const file of files) {
    writeFileSync(join(source, id, file), "{}")
  }
}

function sync(output: string) {
  return syncWorkflows({ source, output, importBase: "../../../workflows" })
}

describe("syncWorkflows", () => {
  it("imports the entry and the API file of each workflow folder", () => {
    const output = fresh()
    folder("effects-ltx-2-5", [
      "entry.json",
      "effects-ltx-2-5.json",
      "effects-ltx-2-5.api.json",
    ])
    folder("_drafts", [])
    expect(sync(output)).toEqual({ listed: ["effects-ltx-2-5"], written: true })
    expect(readFileSync(output, "utf8")).toBe(
      [
        'import type { WorkflowFiles } from "#workflow-entry.contract"',
        'import wEffectsLtx25Api from "../../../workflows/effects-ltx-2-5/effects-ltx-2-5.api.json"',
        'import wEffectsLtx25Entry from "../../../workflows/effects-ltx-2-5/entry.json"',
        "",
        "export const workflowFiles: readonly WorkflowFiles[] = [",
        '  { folder: "effects-ltx-2-5", entry: wEffectsLtx25Entry, graph: wEffectsLtx25Api },',
        "]",
        "",
      ].join("\n")
    )
    expect(sync(output).written).toBe(false)
  })

  it("refuses a folder without its three files or with a name that is not kebab-case", () => {
    const output = fresh()
    folder("voice-chatterbox", ["entry.json", "voice-chatterbox.api.json"])
    folder("Voice_Two", ["entry.json"])
    expect(() => sync(output)).toThrow(
      [
        "The workflows have problems:",
        "Voice_Two: the folder name is not a kebab-case workflow id",
        "voice-chatterbox: voice-chatterbox.json is missing",
      ].join("\n")
    )
  })

  it("writes an empty list when no workflow has landed", () => {
    expect(renderWorkflows([], "../../../workflows")).toBe(
      [
        'import type { WorkflowFiles } from "#workflow-entry.contract"',
        "",
        "export const workflowFiles: readonly WorkflowFiles[] = []",
        "",
      ].join("\n")
    )
  })
})
