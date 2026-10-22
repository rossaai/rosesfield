import { InvalidArgumentError } from "@rosesfield/kernel"
import { type ShotProblem, shotProblemCodeOf } from "#remake/shot-plan"

export class EditRefusedError extends InvalidArgumentError {
  override readonly code: string
  readonly problem: ShotProblem

  constructor(problem: ShotProblem) {
    super({ message: `The edit breaks a limit of Remake: ${problem.code}` })
    this.code = shotProblemCodeOf(problem)
    this.problem = problem
  }
}
