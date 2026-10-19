import { agentCopy } from "@/copy/agent.en"
import { appCopy } from "@/copy/app.en"
import { charactersCopy } from "@/copy/characters.en"
import { connectCopy } from "@/copy/connect.en"
import { errorCopy } from "@/copy/error.en"
import { fieldCopy } from "@/copy/field.en"
import { homeCopy } from "@/copy/home.en"
import { libraryCopy } from "@/copy/library.en"
import { settingsCopy } from "@/copy/settings.en"
import { shellCopy } from "@/copy/shell.en"
import { welcomeCopy } from "@/copy/welcome.en"

export const copy = {
  ...shellCopy,
  ...homeCopy,
  ...appCopy,
  ...fieldCopy,
  ...libraryCopy,
  ...charactersCopy,
  ...agentCopy,
  ...connectCopy,
  ...settingsCopy,
  ...welcomeCopy,
  ...errorCopy,
}

export type CopyKey = keyof typeof copy
