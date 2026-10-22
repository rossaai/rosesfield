import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "@rosesfield/ui/components/alert-dialog"
import { Dialog, DialogContent } from "@rosesfield/ui/components/dialog"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("an alert dialog opened over another dialog", () => {
  it("draws its own scrim over the dialog beneath it", async () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="Close">
          <AlertDialog open>
            <AlertDialogContent>
              <AlertDialogTitle>Delete this image?</AlertDialogTitle>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>
    )
    const confirm = await screen.findByRole("alertdialog")
    const scrims = [...document.querySelectorAll("[data-slot='dialog-scrim']")]
    expect(scrims).toHaveLength(2)
    const last = scrims.at(-1)
    expect(
      last?.compareDocumentPosition(confirm) ===
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBe(true)
  })
})
