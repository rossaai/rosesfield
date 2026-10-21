// Generated. Do not edit.

export const welcomeCopy = {
  "welcome.nav.apps": "Apps",
  "welcome.nav.terms": "Your key",
  "welcome.nav.built": "How it is built",
  "welcome.nav.questions": "Questions",
  "welcome.nav.menu": "Sections",
  "welcome.action.open": "Open Rosesfield",
  "welcome.action.code": "Get the code",
  "welcome.hero.title": "Make images and video in one place",
  "welcome.hero.subtitle": "Every app shares one library and runs on your key",
  "welcome.hero.media.1.label":
    "One run in Rosesfield, from the prompt to the library",
  "welcome.apps.title": "Pick the app for what you make",
  "welcome.apps.subtitle": "Each app names what it takes and makes",
  "welcome.library.title": "Everything you make goes to one library",
  "welcome.library.subtitle": "Any app can take any asset as an input",
  "welcome.library.body.1": "Upload a file once and use it in every app.",
  "welcome.library.body.2":
    "Make a character from a few photos. Every app that takes a character can use it.",
  "welcome.library.body.3":
    "Every run keeps its inputs, seed and model, so you can make it again.",
  "welcome.library.media.1.label":
    "Your library and your history in Rosesfield",
  "welcome.agent.title": "Ask the agent to run apps for you",
  "welcome.agent.subtitle": "It can use one run's result in the next",
  "welcome.agent.body.1":
    "The agent asks before each run and shows its price. You can turn that off.",
  "welcome.agent.body.2":
    "Its model is a setting on your server, with your own model key.",
  "welcome.agent.media.1.label":
    "A conversation with the agent that starts a run",
  "welcome.connect.title": "Use every app from Claude or ChatGPT",
  "welcome.connect.subtitle": "Each app is an MCP tool and an API route",
  "welcome.connect.body.1":
    "Add your server's MCP address to Claude, ChatGPT or any MCP client.",
  "welcome.connect.body.2":
    "Or start a run from your own code with one HTTP request.",
  "welcome.connect.body.3":
    "ChatGPT needs an address on the internet, so host Rosesfield on Cloudflare to use it there.",
  "welcome.terms.title": "Run it on your machine with your key",
  "welcome.terms.subtitle": "Comfy charges your own account for each run",
  "welcome.terms.body.1":
    "No account and no payments to Rosesfield. Every app works fully with your key.",
  "welcome.terms.body.2":
    "Run it on your computer, or on your own Cloudflare account.",
  "welcome.terms.body.3":
    "Each app shows the run's price in Comfy credits beside Generate when Comfy reports it.",
  "welcome.terms.steps":
    "These commands start Rosesfield on your computer with the demo engine.",
  "welcome.terms.open":
    "Then open http://localhost:5173. Add your engine key to .env to run the real models.",
  "welcome.terms.action": "Read the setup steps",
  "welcome.built.title": "How Rosesfield is built",
  "welcome.built.subtitle": "One catalog drives the screens, the API and MCP",
  "welcome.built.body.1":
    "Each app is one definition. It gives the screen, the API route, the MCP tool and the agent's tool.",
  "welcome.built.body.2":
    "Comfy sits behind one engine port. Another engine needs one adapter and no change to the apps.",
  "welcome.built.body.3":
    "Results copy to your own storage when a run ends, because Comfy deletes hosted model results after 24 hours.",
  "welcome.built.action": "Read the architecture",
  "welcome.models.title": "The models each app uses",
  "welcome.models.subtitle": "Each licence sets what you may do with results",
  "welcome.models.column.app": "App",
  "welcome.models.column.model": "Model",
  "welcome.models.column.kind": "Kind",
  "welcome.models.column.licence": "Licence",
  "welcome.models.body.1":
    "Every model here is open weights. No app calls a partner node or a closed API.",
  "welcome.models.body.2":
    "Rosesfield ships no weights. Each workflow links its models to their source.",
  "welcome.models.usedBy": "Used by {apps}",
  "welcome.models.agent":
    "The agent runs the open-weights model your server sets.",
  "welcome.models.agentLink": "MiniMax M3 on Hugging Face",
  "welcome.models.check":
    "A test in the repository checks that no app binds a partner node.",
  "welcome.models.checkLink": "Read the test",
  "welcome.models.parts":
    "Every part each workflow loads, with its licence, is in the README.",
  "welcome.models.partsLink": "Read every licence",
  "welcome.model.flux-2-klein-4b": "FLUX.2 Klein 4B",
  "welcome.model.z-image-turbo": "Z-Image Turbo",
  "welcome.model.qwen-image-2512": "Qwen Image 2512",
  "welcome.model.qwen-image": "Qwen Image",
  "welcome.model.qwen-image-edit-2511": "Qwen Image Edit 2511",
  "welcome.model.qwen-image-edit-2509": "Qwen Image Edit 2509",
  "welcome.model.qwen-image-layered": "Qwen Image Layered",
  "welcome.model.ltx-2-5": "LTX 2.5",
  "welcome.model.wan-2-1-vace": "Wan 2.1 VACE, 14B",
  "welcome.model.infinitetalk": "InfiniteTalk",
  "welcome.model.seedvr2": "SeedVR2, 3B and 7B",
  "welcome.model.birefnet": "BiRefNet",
  "welcome.model.lucida": "Lucida",
  "welcome.model.film": "FILM",
  "welcome.model.chatterbox": "Chatterbox Multilingual",
  "welcome.licence.apache-2-0": "Apache-2.0",
  "welcome.licence.mit": "MIT",
  "welcome.licence.bsd-3-clause": "BSD-3-Clause",
  "welcome.licence.ltx-community": "LTX-2.x Community License",
  "welcome.licence.sam": "SAM License",
  "welcome.licence.film": "Apache-2.0 for the code",
  "welcome.licence.scail": "MIT in the model card",
  "welcome.questions.title": "Questions",
  "welcome.question.1.title": "What do I need to run it?",
  "welcome.question.1.body":
    "A Comfy key, and a computer with bun or a Cloudflare account. The README has the steps.",
  "welcome.question.2.title": "What does a run cost?",
  "welcome.question.2.body":
    "Comfy charges your account for each run. The price shows beside Generate in Comfy credits when Comfy reports it. When it does not, the screen says the price is unknown.",
  "welcome.question.3.title": "Where do my files go?",
  "welcome.question.3.body":
    "Your files stay in your own storage: a folder on your computer, or your own Cloudflare account. A run sends its inputs to the engine that runs the app.",
  "welcome.question.4.title": "Can someone else spend my key?",
  "welcome.question.4.body":
    "Not without your owner token. A server that is open to the internet refuses to start without one.",
  "welcome.question.5.title": "Does a character train a model on my photos?",
  "welcome.question.5.body":
    "No. A character is a set of your reference photos. Each run uses them as references.",
  "welcome.question.6.title": "Can I use the results in my work?",
  "welcome.question.6.body":
    "That depends on the licence of the model that made them. Each model's licence is linked in the models section.",
  "welcome.question.7.title": "Is there a paid version?",
  "welcome.question.7.body":
    "No. Every app in this repository works fully with your own key.",
  "welcome.question.8.title": "Does it work on a phone?",
  "welcome.question.8.body":
    "Yes, in the browser. You can add it to your home screen from the browser.",
  "welcome.footer.code": "Source code",
  "welcome.footer.licence": "MIT licence",
  "welcome.footer.trademarks": "Trademarks",
  "welcome.footer.trademark":
    "The Rosesfield name and logo are trademarks of ROSSA AI, LLC.",
  "welcome.footer.maker": "Made by ROSSA AI, LLC.",
  "welcome.footer.sponsor": "To sponsor Rosesfield, write to {address}.",
} satisfies Record<string, string>
