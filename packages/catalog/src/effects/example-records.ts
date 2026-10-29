import buildingsRipple from "./recipes/buildings-ripple.json"
import flipIntoANewPlace from "./recipes/flip-into-a-new-place.json"
import freezeAndCircle from "./recipes/freeze-and-circle.json"
import grabAndRun from "./recipes/grab-and-run.json"
import growGiant from "./recipes/grow-giant.json"
import manyCopies from "./recipes/many-copies.json"
import meltAway from "./recipes/melt-away.json"
import pullBackToSpace from "./recipes/pull-back-to-space.json"
import pushIntoEye from "./recipes/push-into-eye.json"
import scatterPetals from "./recipes/scatter-petals.json"
import stillInTheStreet from "./recipes/still-in-the-street.json"
import ticketWipe from "./recipes/ticket-wipe.json"
import runs from "./runs.json"

export const exampleRecords: Readonly<Record<string, unknown>> = {
  "buildings-ripple": buildingsRipple,
  "flip-into-a-new-place": flipIntoANewPlace,
  "freeze-and-circle": freezeAndCircle,
  "grab-and-run": grabAndRun,
  "grow-giant": growGiant,
  "many-copies": manyCopies,
  "melt-away": meltAway,
  "pull-back-to-space": pullBackToSpace,
  "push-into-eye": pushIntoEye,
  "scatter-petals": scatterPetals,
  "still-in-the-street": stillInTheStreet,
  "ticket-wipe": ticketWipe,
}

export const exampleRunRows: unknown = runs
