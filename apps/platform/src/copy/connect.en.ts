// Generated. Do not edit.

export const connectCopy = {
  "connect.title": "Connect",
  "connect.client.label": "Client",
  "connect.tab.claude": "Claude",
  "connect.tab.chatgpt": "ChatGPT",
  "connect.tab.other": "Other",
  "connect.tab.api": "HTTP API",
  "connect.address.label": "Server address",
  "connect.copy": "Copy",
  "connect.local.title": "{client} cannot reach this computer",
  "connect.local.body":
    "{client} runs on its own servers. Host Rosesfield on your Cloudflare account to give it an address it can reach.",
  "connect.local.action": "Read the hosting steps",
  "connect.steps.title": "Steps",
  "connect.tools.title": "Tools, one per app",
  "connect.routes.title": "Routes, one per app",
  "connect.api.schema": "Schema",
  "connect.api.copyExample": "Copy an example request",
  "connect.api.schemaFailed": "The schema did not load",
  "connect.token.note":
    "Every request carries your owner token in its Authorization header.",
  "connect.key.note":
    "In this demo, every request carries your own engine key in its X-Engine-Key header. The server never stores it.",
  "connect.failed.title": "The server address did not load",
  "connect.claude.step.1": "In Claude Code, add the server with this command.",
  "connect.claude.step.2":
    "In Claude Code, run the mcp command and check that it lists rosesfield.",
  "connect.claude.step.3": "Ask Claude to run an app by its name.",
  "connect.chatgpt.step.1":
    "In ChatGPT, open Settings, then Apps and connectors, and turn on developer mode.",
  "connect.chatgpt.step.2":
    "Create a connector and paste the server address as its URL.",
  "connect.chatgpt.step.3":
    "In a chat, turn on the connector and ask it to run an app by its name.",
  "connect.other.step.1":
    "Add a server of the type Streamable HTTP to your client, as in this example.",
  "connect.other.step.2": "Use the server address as its URL.",
  "connect.other.step.3": "Ask your client to list the tools of rosesfield.",
  "connect.api.step.1":
    "Start a run with POST and the inputs as JSON, as in this example.",
  "connect.api.step.2":
    "Read the run by its id from its runs route until its status is done, failed or cancelled.",
  "connect.api.step.3":
    "Read each result by its asset id from the assets route.",
  "connect.cancel": "Cancel",
} satisfies Record<string, string>
