// Generated. Do not edit.

export const motionCopy = {
  "motion.name": "Motion",
  "motion.line": "Put your character, product or clothes into a video.",
  "motion.keywords":
    "motion transfer, motion control, swap a character, effects, put a product in a video, try on clothes in a video, dance",
  "motion.empty.title": "Your videos show here",
  "motion.input.photo.label": "Photo",
  "motion.input.photo.note":
    "A photo of a character, a product or clothes. PNG, JPEG or WebP, up to 20 MB.",
  "motion.input.photo.unreadable":
    "a PNG, JPEG or WebP photo this browser can open",
  "motion.input.clip.label": "Video",
  "motion.input.clip.note":
    "One person moving. MP4, MOV or WebM, 2 to 10 seconds, up to 100 MB.",
  "motion.input.clip.unreadable":
    "an MP4, MOV or WebM video this browser can open",
  "motion.input.sound.label": "Keep the video's sound",
  "motion.input.scene.label": "Scene",
  "motion.input.scene.placeholder":
    "Where is the person, and what is the light like?",
  "motion.input.scene.note":
    "Describe the place and the light. The video sets every movement.",
  "motion.input.resolution.label": "Resolution",
  "motion.input.resolution.note": "The short side of the video in pixels.",
  "motion.input.seed.label": "Seed",
  "motion.formats.photo": "PNG, JPEG or WebP",
  "motion.formats.clip": "MP4, MOV or WebM",
  "motion.choice.resolution.p480": "480p",
  "motion.choice.resolution.p720": "720p",
  "motion.tabs.label": "Mode",
  "motion.tab.move": "Move a photo",
  "motion.tab.swap": "Swap a character",
  "motion.input.clip.range":
    "{model} takes videos of {min} to {max} seconds. This one runs {seconds} seconds.",
  "motion.input.model.label": "Model",
  "motion.model.ltx23": "LTX 2.3 control",
  "motion.model.ltx23Guide": "LTX 2.3 depth guide",
  "motion.input.guide.label": "Guide video",
  "motion.input.guide.note":
    "A depth video that sets the camera and the movement, such as a Blender render. Its first frame matches your photo.",
  "motion.price.fromControl":
    "Generate, {amount} Comfy credits, estimated from your runs of LTX 2.3 control",
  "motion.example.own": "Your video",
  "motion.example.change": "Use your own video",
  "motion.example.buildingsRipple.name": "Buildings ripple",
  "motion.example.buildingsRipple.photo": "A person in front of buildings",
  "motion.example.flipIntoANewPlace.name": "Flip into a new place",
  "motion.example.flipIntoANewPlace.photo":
    "You seated on a tall chair, seen from low down, phone upright",
  "motion.example.freezeAndCircle.name": "Freeze and circle",
  "motion.example.freezeAndCircle.photo": "A person in motion",
  "motion.example.grabAndRun.name": "Grab and run",
  "motion.example.grabAndRun.photo":
    "You, head to knees, facing the camera, phone upright",
  "motion.example.growGiant.name": "Grow into a giant",
  "motion.example.growGiant.photo": "A person on a street",
  "motion.example.manyCopies.name": "Fill with copies",
  "motion.example.manyCopies.photo": "One person with space around them",
  "motion.example.meltAway.name": "Melt away",
  "motion.example.meltAway.photo": "A person, head to toe",
  "motion.example.pullBackToSpace.name": "Pull back to space",
  "motion.example.pullBackToSpace.photo": "A person outdoors",
  "motion.example.pushIntoEye.name": "Push into the eye",
  "motion.example.pushIntoEye.photo": "A close photo of one face",
  "motion.example.scatterPetals.name": "Scatter into petals",
  "motion.example.scatterPetals.photo": "A person, head to toe",
  "motion.example.stillInTheStreet.name": "Still in a busy street",
  "motion.example.stillInTheStreet.photo": "A person on a busy street",
  "motion.example.ticketWipe.name": "Ticket wipe",
  "motion.example.ticketWipe.photo":
    "You whole, side on, mid-step, phone sideways",
  "motion.agent.howTo":
    "Runs an example from the Library on a photo in one call. Before the call, read the photo and hold it against the example's need below. Ask one question only when it fails the need. Run at 480p first and show the draft with the price of the final. Run 720p or 1080p only after the person says yes.",
  "motion.agent.need": "{example}: {need}",
  "motion.input.photo.tall": "a tall photo, taken with the phone upright",
  "motion.input.photo.wide": "a wide photo, taken with the phone sideways",
  "motion.choice.resolution.p1080": "1080p",
  "motion.chain.makeFinal": "Make final",
  "motion.chain.renderFinal": "Render the final at {resolution}",
  "motion.chain.startOver": "Start over",
  "motion.chain.price.example":
    "{amount} Comfy credits, measured on a {seconds}-second {resolution} run",
  "motion.model.ltx25": "LTX 2.5",
  "motion.input.photos.label": "Photos",
  "motion.input.photos.note":
    "1 to 15 photos of people, products or clothes your video should show.",
  "motion.input.change.label": "Prompt",
  "motion.input.change.placeholder":
    "Replace the man on the left, not the woman",
  "motion.input.change.note":
    "Say what to change and how it looks. Your video keeps its camera and its timing.",
  "motion.chain.leftOut.one":
    "Photo {photos} matches nothing in your video, so the draft leaves it out.",
  "motion.chain.leftOut.other":
    "Photos {photos} match nothing in your video, so the draft leaves them out.",
  "motion.agent.ownVideo":
    "Changes your own video in one call: the video in inputs.clip, 1 to 15 photos of people, products or clothes in inputs.photo, and an optional sentence in inputs.scene. The call makes a 480p draft and answers with it, the credits of the final and the photos that matched nothing. Show the person the draft and that price. Only after they say yes, make the final with a second call that names the draft run id in inputs.draft, with the same photos and the resolution they chose.",
  "motion.chain.price.unread":
    "{amount} Comfy credits, measured on a {seconds}-second {resolution} run, plus reading your video, which no run has measured yet",
} as const
