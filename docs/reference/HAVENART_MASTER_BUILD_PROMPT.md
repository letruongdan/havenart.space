# HAVENART — MASTER BUILD PROMPT

You are the lead product designer, creative technologist, 3D web engineer, frontend architect, and implementation agent for a premium architectural studio website called **HavenArt**.

Your job is not merely to build a landing page.

Build a cinematic, scroll-driven digital architectural experience where the visitor travels continuously from outside a house into its interior, discovers the design philosophy of each space, interacts with architectural and furniture details, exits toward the garden, and is ultimately converted into a qualified architecture lead.

The experience should feel restrained, premium, calm, cinematic, highly intentional, and closer to a luxury architecture presentation than a conventional marketing website.

Do not copy Apple's visual assets, layouts, trademarks, animations, or code.

Use Apple-like principles only as inspiration:

- restraint
- typography hierarchy
- generous whitespace
- smooth motion
- minimal interface chrome
- progressive storytelling
- one clear idea per scene
- product-first presentation

---

# 1. PRODUCT

Brand:

**HavenArt**

Vietnamese positioning:

**Kiến tạo nơi bạn thuộc về.**

English positioning:

**Designing the place you belong.**

Primary purpose:

Generate qualified leads for residential architectural design services.

Primary CTA:

**Liên hệ kiến trúc sư**

English:

**Talk to an Architect**

Secondary contact channels:

- Zalo
- Facebook Messenger
- WhatsApp

Do not invent phone numbers, usernames, URLs, addresses, testimonials, awards, client counts, or project statistics.

All unknown contact information must live in configuration files with obvious placeholders.

---

# 2. TARGET CUSTOMER

Design primarily for Vietnamese homeowners who are preparing to:

- build a new home
- build a townhouse
- build a villa
- build a garden house
- significantly renovate an existing home

The target customer is willing to invest in thoughtful design and values:

- quality of life
- natural light
- ventilation
- privacy
- materials
- greenery
- spatial experience
- long-term usability
- aesthetic longevity

The website should communicate premium quality without feeling ostentatious.

The emotional positioning is:

**quiet luxury rather than visible luxury.**

---

# 3. VISUAL DIRECTION

Primary architectural style:

**Contemporary Tropical Minimalism**

Combine:

- contemporary architecture
- tropical living
- Japanese restraint
- warm minimalism
- natural materials
- quiet luxury

Primary materials:

- warm natural wood
- travertine / limestone
- microcement
- textured plaster
- clear glass
- brushed metal accents
- linen
- natural fabric
- greenery
- shallow water where appropriate

Avoid:

- excessive marble
- excessive gold
- overly futuristic architecture
- neon effects
- sci-fi UI
- gaming HUD aesthetics
- excessive bloom
- excessive glassmorphism
- visual clutter

The house should feel plausible and buildable.

---

# 4. LIGHTING STORY

The entire website represents one continuous cinematic journey.

Lighting progresses subtly from:

**late golden hour → warm sunset → early dusk**

This progression must be subtle.

It must not feel like a time-lapse gimmick.

Exterior:

- warm late-afternoon directional sunlight
- soft long shadows
- natural sky contribution

Interior:

- sunlight enters through architectural openings
- warm indirect light
- practical lights gradually become visible

Garden finale:

- early blue-hour atmosphere
- warm light from inside the house
- strong contrast between warm interior and cooler exterior environment

Lighting itself is part of the storytelling.

---

# 5. EXPERIENCE PRINCIPLE

The page must behave like one continuous architectural film controlled by scrolling.

There must be:

**NO HARD CAMERA CUTS.**

Do not teleport the camera between rooms.

Do not use conventional page-to-page transitions between architectural spaces.

The camera travels through one continuous spatial path.

Scrolling controls progress through the experience.

The user should feel as though they are physically moving through the project.

---

# 6. CAMERA SYSTEM

Do not implement the experience as hundreds of arbitrary camera position tweens.

Create a reusable camera storytelling system.

Use a camera rail based on a spline/path.

Recommended conceptual implementation:

- CatmullRomCurve3 or an equivalent spline
- normalized global progress from 0.0 → 1.0
- separate target/look-at path where necessary
- quaternion interpolation for orientation
- chapter markers along the timeline
- easing zones around important moments
- camera speed curves independent from raw scroll speed

Architecture:

Scroll position
→ normalized story progress
→ cinematic timeline
→ camera rail position
→ look-at/orientation
→ lighting state
→ active room
→ UI state
→ hotspot visibility
→ environment state
→ audio mix

The camera should:

- move faster through transition corridors
- slow down when entering important rooms
- briefly settle around storytelling moments
- gently rotate toward architectural focal points
- never snap abruptly
- never make the user feel motion sick

Avoid aggressive roll.

Keep camera FOV architectural and natural.

Target approximately 35–55 mm full-frame equivalent aesthetics rather than extreme wide-angle distortion.

---

# 7. STORY CHAPTERS

Design the complete system around these chapters even if Phase 1 implements only a subset.

## CHAPTER 00 — INTRO / EXTERIOR

Camera begins outside the property.

Visitor sees:

- vegetation
- architectural mass
- driveway or approach
- warm afternoon light
- subtle movement in foliage

Primary copy:

VI:

**HavenArt**

**Kiến tạo nơi bạn thuộc về.**

EN:

**HavenArt**

**Designing the place you belong.**

Supporting concept:

A home should begin with how its owners want to live, not with walls.

---

## CHAPTER 01 — APPROACH

The camera moves toward the house.

Story:

Architecture begins before someone enters the building.

Use:

- landscape
- shadow
- compression
- framing
- approach sequence

to create anticipation.

VI concept:

**Kiến trúc bắt đầu trước ngưỡng cửa.**

EN:

**Architecture begins before the threshold.**

---

## CHAPTER 02 — ENTRANCE

Camera passes continuously through the entrance.

The entrance represents transition:

outside → inside  
public → personal  
movement → calm

Story:

The entrance is not simply a door.

It changes the emotional state of the visitor.

---

## CHAPTER 03 — LIVING ROOM

This is one of the hero spaces.

The camera slows significantly.

Design intent:

- generous glazing
- framed garden
- controlled sunlight
- connection between living room and landscape
- warm materials
- comfortable proportions

VI concept:

**Một không gian cho những cuộc gặp gỡ.**

EN:

**A space designed for connection.**

Story:

The living room should blur the boundary between architecture and garden.

Natural light should become part of the room rather than merely illuminate it.

---

## CHAPTER 04 — KITCHEN & DINING

Design around everyday life rather than decoration.

Show relationships between:

- kitchen island
- dining table
- garden
- circulation
- storage
- family interaction

VI:

**Nơi nhịp sống hội tụ.**

EN:

**Where everyday life comes together.**

Story:

Good architecture should make ordinary routines feel effortless.

---

## CHAPTER 05 — COURTYARD / LIGHT WELL

This is an architectural signature moment.

Show:

- vertical natural light
- vegetation
- shadow movement
- natural ventilation
- transition between major zones

VI:

**Ánh sáng là một vật liệu.**

EN:

**Light is a material.**

This chapter should strongly demonstrate HavenArt's design philosophy.

---

## CHAPTER 06 — MASTER BEDROOM

Movement and UI become quieter.

Reduce visual noise.

Story themes:

- privacy
- acoustic comfort
- morning light
- view framing
- ventilation
- tactile materials

VI:

**Sự tĩnh lặng cũng cần được thiết kế.**

EN:

**Quiet is something we design.**

---

## CHAPTER 07 — BATHROOM

Use:

- stone
- soft indirect lighting
- greenery where appropriate
- natural textures
- privacy

Position the bathroom as a small restoration ritual rather than just a utility room.

---

## CHAPTER 08 — READING / WORKSPACE

Small but thoughtful space.

Story:

A place for focus should not necessarily be disconnected from nature.

Use framed vegetation, controlled light, and acoustic calm.

---

## CHAPTER 09 — BALCONY

Camera transitions back toward exterior space.

Create visual breathing room.

Show the relationship between house, landscape, weather, and horizon.

---

## CHAPTER 10 — GARDEN

This is the emotional resolution.

Landscape becomes dominant again.

Possible elements:

- planting
- warm exterior lighting
- shallow reflecting pool
- outdoor seating
- moving leaves
- warm interior visible through glazing

VI:

**Kiến trúc trả lại chỗ cho thiên nhiên.**

EN:

**Architecture gives space back to nature.**

---

## CHAPTER 11 — FINAL REVEAL

Camera gradually rises or pulls back.

Reveal the relationship between:

- architecture
- interior
- garden
- light
- landscape

Final message:

VI:

**Ngôi nhà của bạn nên kể câu chuyện của chính bạn.**

EN:

**Your home should tell your story.**

Primary CTA:

**Liên hệ kiến trúc sư**

**Talk to an Architect**

Show:

- Zalo
- Messenger
- WhatsApp

Do not create fake contact URLs.

Use configuration placeholders.

---

# 8. INTERACTIVE HOTSPOTS

The experience must allow selected objects and architectural details to be explored.

Hotspots should appear only when:

- the relevant room is active
- the camera is sufficiently close
- the object is visible

Possible hotspot categories:

Furniture  
Material  
Lighting  
Architecture  
Landscape  
Design Detail

Examples:

Travertine wall  
Oak cabinetry  
Pendant lamp  
Sliding glass system  
Sofa  
Kitchen island  
Courtyard tree  
Indirect lighting detail

Interaction:

hover
→ subtle highlight / micro-animation

click
→ open contextual information panel

Panel content:

- object/material name
- category
- short description
- why it was selected
- optional design insight

Example:

**Travertine Wall**

Natural Stone

VI:

Bề mặt đá có sắc độ ấm giúp phản xạ ánh sáng gián tiếp và tạo chiều sâu cho không gian mà không cần thêm trang trí.

EN:

The warm stone surface reflects indirect light and gives the space visual depth without relying on decoration.

Do not turn the experience into an ecommerce product catalog.

Hotspots exist to explain architectural thinking.

---

# 9. ROOM INFORMATION

Each room has an optional architecture story panel.

The panel may contain:

Room title  
Design intention  
Key principles  
Material strategy  
Light strategy

Keep copy concise.

A visitor should be able to ignore all text and still enjoy the experience.

---

# 10. AUDIO

Implement optional spatial/ambient audio.

Audio must be:

**OFF BY DEFAULT.**

The visitor must explicitly enable sound.

Possible ambient layers:

Exterior:
- soft wind
- distant birds
- leaves

Interior:
- extremely subtle room tone

Courtyard:
- vegetation
- optional distant water

Garden:
- soft wind
- plants
- subtle water

Crossfade audio based on chapter progress.

Never autoplay audible sound.

Respect browser autoplay rules.

Respect user preferences.

Audio must never be necessary for understanding the website.

---

# 11. INTERNATIONALIZATION

Website must support:

Vietnamese  
English

Recommended URL strategy:

/vi  
/en

Vietnamese is the default experience.

All marketing content, architecture stories, room titles, CTA copy, accessibility labels, and metadata must be translatable.

Do not duplicate strings throughout components.

Create structured locale dictionaries.

---

# 12. TECH STACK

Use a modern production-quality stack based on:

- Next.js App Router
- TypeScript with strict mode
- React
- React Three Fiber
- Three.js
- @react-three/drei
- GSAP
- ScrollTrigger
- Zustand or an equivalently lightweight state store
- Tailwind CSS for DOM UI
- GLTF / GLB assets
- Meshopt and/or Draco where appropriate
- KTX2/Basis texture compression where practical

Use postprocessing only when justified.

Possible subtle effects:

- antialiasing
- ambient occlusion
- subtle bloom for practical lights
- restrained depth of field
- tone mapping
- subtle color grading

Avoid heavy cinematic filters.

Architecture and lighting should create the visual quality, not post-processing tricks.

---

# 13. SCROLL ARCHITECTURE

Prefer native scrolling.

Do not aggressively hijack scrolling.

GSAP ScrollTrigger may synchronize the page scroll with the story timeline.

If using a smooth-scroll library, it must only be added after confirming:

- accessibility remains correct
- mobile behavior is stable
- ScrollTrigger synchronization is reliable
- performance does not regress

The experience must remain usable with normal wheel, trackpad, keyboard, and touch input.

---

# 14. REDUCED MOTION

Respect:

prefers-reduced-motion

For reduced motion users:

do not force a long camera flight.

Instead provide:

- mostly static architectural views
- gentle fades
- conventional content sections
- full access to room stories
- full access to CTA and contact information

The website must remain complete without cinematic motion.

---

# 15. MOBILE STRATEGY

Desktop is the primary experience.

Mobile must still work well.

Mobile may use:

- lower DPR
- reduced geometry
- lower texture resolution
- fewer dynamic shadows
- reduced postprocessing
- fewer moving environmental objects
- simplified camera path
- reduced hotspot density

Do not attempt to render desktop fidelity blindly on mobile.

Create adaptive quality levels.

Suggested levels:

HIGH  
MEDIUM  
LOW  
FALLBACK

Automatically downgrade when sustained performance is poor.

---

# 16. FALLBACK

If WebGL is unavailable or rendering repeatedly fails:

show a high-quality non-3D version of the landing page.

The visitor must still receive:

- HavenArt positioning
- architectural story
- services
- room philosophy
- final CTA
- Zalo
- Messenger
- WhatsApp

3D must enhance the business experience.

It must not be required for conversion.

---

# 17. SEO

The WebGL canvas must not contain the only copy on the page.

Important copy must exist in semantic HTML.

Implement:

- metadata
- Open Graph metadata
- canonical URLs
- localized metadata
- sitemap
- robots
- semantic headings
- structured content

Use appropriate organization/professional-service structured data only when actual business information is known.

Never invent an address, rating, reviews, or business claims.

---

# 18. LEAD CONVERSION

The cinematic journey must ultimately serve lead generation.

Do not place aggressive popup forms throughout the experience.

Use progressive conversion.

Possible CTA moments:

early:
subtle persistent contact affordance

mid-story:
optional small CTA

final:
strong architecture consultation CTA

Final conversion area should allow:

- Zalo
- Messenger
- WhatsApp

Architecture must remain the hero.

---

# 19. PERFORMANCE TARGETS

The 3D experience must be built around explicit budgets.

Phase 1 recommended goals:

Compressed initial core 3D payload:
approximately <= 8 MB when realistically achievable

Total initial scene assets:
prefer <= 15 MB before progressive loading

Textures:
prefer 1K / 2K compressed textures

Avoid unnecessary 4K textures.

Desktop visible triangle target:
approximately <= 1–1.5 million

Draw calls:
preferably <= 200 in the active Phase 1 scene

Desktop:
target smooth 60 FPS on a reasonably modern GPU

Mobile:
maintain usable >= 30 FPS where 3D mode is enabled

DPR:

Desktop:
adaptive approximately 1–1.5

Mobile:
approximately 1 where necessary

Use adaptive quality monitoring.

Rooms that are far from the current chapter should not consume unnecessary GPU resources.

---

# 20. ASSET BUDGET

Budget:

**0 USD**

Do not require paid models, textures, HDRIs, music, fonts, or services.

Use:

- original procedural geometry
- generated placeholder geometry
- freely licensed textures
- freely licensed HDRIs
- freely licensed 3D assets
- system/open fonts

Prefer CC0 or public-domain assets whenever possible.

For EVERY third-party asset create:

ASSET_LICENSES.md

Record:

- asset name
- original source URL
- creator
- license
- attribution requirement
- file used
- modifications made

Do not include assets if licensing is unclear.

---

# 21. 3D ASSET STRATEGY

Do NOT block the project because a finished villa GLB does not exist.

Phase 1 should use a modular architectural prototype.

Build a coherent villa environment from components such as:

- floors
- walls
- glass planes
- ceilings
- columns
- openings
- doors
- large sliding glass panels
- terrace
- landscape volumes
- simple furniture proxies

Use proper physically-based materials.

The goal of Phase 1 is proving:

camera  
storytelling  
lighting  
interaction  
UX  
performance  
conversion

not spending the entire project on modeling furniture.

The architecture must be designed so higher-quality GLB assets can replace prototype assets later without changing the storytelling system.

---

# 22. MODEL PIPELINE

Design the project around replaceable scene zones.

Recommended asset organization concept:

exterior.glb  
entrance.glb  
living.glb  
kitchen.glb  
courtyard.glb  
bedroom.glb  
bathroom.glb  
workspace.glb  
garden.glb

Do not require all assets to load immediately.

Preload the active room and the next likely room.

Dispose resources no longer required where appropriate.

Document origin conventions, scale conventions, material naming, and coordinate systems.

Use:

1 unit = 1 meter

unless a strong technical reason requires another convention.

---

# 23. PHASE 1 VERTICAL SLICE

Implement first:

INTRO / EXTERIOR  
→ APPROACH  
→ ENTRANCE  
→ LIVING ROOM  
→ GARDEN  
→ FINAL CTA

This Phase 1 must demonstrate the complete underlying architecture.

It must already contain:

- continuous spline camera
- room/chapter state system
- scroll timeline
- bilingual copy
- hotspot system
- lighting transitions
- adaptive quality
- loading experience
- contact CTA
- responsive DOM UI
- reduced-motion fallback
- WebGL fallback
- asset licensing system

Do not create throwaway prototype architecture.

Build Phase 1 as the foundation of the production application.

---

# 24. PHASE 2

After Phase 1 architecture is stable, expand to:

KITCHEN / DINING  
COURTYARD  
MASTER BEDROOM  
BATHROOM  
READING / WORKSPACE  
BALCONY

Do not redesign the camera or chapter system.

Simply extend the existing data-driven story.

---

# 25. DATA-DRIVEN STORY SYSTEM

Do not hardcode every chapter into different components.

Create a structured story configuration.

Conceptually:

StoryChapter {
  id
  slug
  progressStart
  progressEnd
  cameraRange
  localeCopy
  lightingPreset
  audioPreset
  hotspotIds
  qualityHints
}

Hotspot {
  id
  room
  position
  category
  localeContent
  activationRange
}

LightingPreset {
  environment
  sunIntensity
  sunDirection
  ambientIntensity
  practicalLights
  exposure
}

Make story configuration editable without rewriting rendering logic.

---

# 26. UI SYSTEM

UI should be extremely restrained.

Possible persistent elements:

HavenArt logo  
language switcher  
sound toggle  
minimal progress indicator  
contact shortcut

During storytelling:

small typography blocks may fade in/out.

Avoid:

- huge navbars
- dashboard interfaces
- thick borders
- too many floating cards
- unnecessary menus

Typography should feel editorial and architectural.

Use an open-source font.

Pairing suggestion concept:

clean modern sans-serif  
+
optional refined editorial serif for selected headlines

Do not introduce more than two font families.

---

# 27. LOADING EXPERIENCE

The visitor should see useful content immediately.

Do not display an empty black canvas while all models download.

Initial page:

- brand
- hero text
- architectural poster/fallback state
- loading progress

Load the 3D experience progressively.

Transition into the cinematic experience only when the minimum viable scene is ready.

---

# 28. HOTSPOT UX

Desktop:

hover:
subtle indication

click:
open contextual panel

Escape:
close

click outside:
close

Keyboard:
hotspots must have accessible equivalents in DOM

Do not make information inaccessible because it exists only as a 3D sprite.

---

# 29. ARCHITECTURAL DETAILING

Photorealism should come from:

- believable proportions
- good composition
- correct roughness
- correct material scale
- lighting
- contact shadows
- environment reflections
- subtle imperfections
- carefully framed camera movement

Do not compensate for weak architecture using excessive postprocessing.

---

# 30. ENVIRONMENTAL MOTION

Use sparingly:

- subtle plant motion
- very light curtain movement
- water movement
- shifting reflections

Motion must be slow and natural.

Never make all objects move simultaneously.

The house should feel alive, not animated.

---

# 31. SOURCE STRUCTURE

Prefer a structure conceptually similar to:

src/
  app/
    [locale]/
  components/
    ui/
    scene/
    story/
    hotspots/
  config/
  content/
    vi/
    en/
  hooks/
  lib/
    three/
    performance/
    audio/
  stores/
  styles/
  types/

public/
  models/
  textures/
  hdr/
  audio/
  images/

docs/

scripts/

The exact structure may be improved if there is a clear architectural reason.

---

# 32. DOCUMENTATION TO CREATE FIRST

Before implementing substantial UI, create:

docs/PROJECT_VISION.md

docs/USER_JOURNEY.md

docs/UX_STORYBOARD.md

docs/SCENE_ARCHITECTURE.md

docs/CAMERA_SCROLL_SPEC.md

docs/STORY_CHAPTER_SPEC.md

docs/HOTSPOT_SPEC.md

docs/LIGHTING_SPEC.md

docs/AUDIO_SPEC.md

docs/I18N_SPEC.md

docs/ASSET_PIPELINE.md

docs/PERFORMANCE_BUDGET.md

docs/ACCESSIBILITY_SPEC.md

docs/SEO_SPEC.md

docs/IMPLEMENTATION_PLAN.md

docs/TASKS.md

docs/ACCEPTANCE_CRITERIA.md

ASSET_LICENSES.md

Do not create empty placeholder documents.

Each document must contain actionable engineering or design decisions.

---

# 33. IMPLEMENTATION PLAN

Break implementation into clear milestones.

Recommended sequencing:

Milestone A:
project foundation and documentation

Milestone B:
DOM layout, i18n, design system, brand shell

Milestone C:
3D scene foundation

Milestone D:
continuous camera rail and scroll timeline

Milestone E:
Exterior → Entrance → Living Room vertical slice

Milestone F:
hotspot system

Milestone G:
lighting and environmental transitions

Milestone H:
Garden + final CTA

Milestone I:
audio

Milestone J:
adaptive performance

Milestone K:
mobile and reduced-motion behavior

Milestone L:
SEO, accessibility, analytics-ready events, polish

Milestone M:
Phase 2 room expansion

---

# 34. ANALYTICS-READY EVENTS

Do not require a paid analytics service.

Create an internal event abstraction for future analytics.

Events should include concepts such as:

experience_started  
chapter_entered  
hotspot_opened  
language_changed  
audio_enabled  
cta_clicked  
zalo_clicked  
messenger_clicked  
whatsapp_clicked  
experience_completed

No personally identifiable information should be logged by default.

---

# 35. LEAD FORM

A full form is optional for Phase 1.

Primary contact channels remain:

Zalo  
Messenger  
WhatsApp

However create architecture that can later support a consultation form including:

name  
contact  
project type  
location  
estimated area  
expected build time  
notes

Do not collect unnecessary information.

---

# 36. CODING QUALITY

Use:

- strict TypeScript
- small focused components
- declarative configuration
- reusable scene systems
- clear ownership of state
- predictable cleanup
- lazy loading where useful
- no giant monolithic Experience.tsx

Avoid premature abstraction, but do not hardcode the experience in a way that prevents additional rooms.

---

# 37. ERROR HANDLING

Handle:

- failed GLB load
- failed texture load
- missing WebGL
- low GPU capability
- audio unavailable
- unsupported browser behavior

Failure of one decorative asset must not destroy the entire page.

---

# 38. TESTING

Include practical tests for:

- chapter progress mapping
- locale content
- CTA links/configuration
- reduced-motion mode
- WebGL fallback
- hotspot state
- route localization
- story configuration validation

Where browser automation is available, add smoke tests covering:

load page  
start experience  
scroll through Phase 1  
open hotspot  
change language  
reach CTA

---

# 39. ACCEPTANCE CRITERIA — PHASE 1

Phase 1 is successful when:

1. The user lands on a premium HavenArt hero.

2. The 3D scene progressively loads without blocking all content.

3. Scrolling continuously moves the camera from exterior to the house.

4. The camera physically enters the house without a hard cut.

5. The visitor arrives in a convincing living room scene.

6. At least three meaningful hotspots can be explored.

7. Vietnamese and English both work.

8. Lighting evolves subtly through the journey.

9. Camera movement remains coherent when scrolling forward and backward.

10. Reverse scrolling correctly reverses the architectural journey.

11. Garden finale creates a clear emotional conclusion.

12. Final CTA clearly offers:
    - Zalo
    - Messenger
    - WhatsApp

13. Reduced-motion users receive a complete alternative experience.

14. Mobile does not attempt desktop rendering quality blindly.

15. Asset licenses are documented.

16. No paid asset is required.

17. No fake business information exists.

18. The codebase clearly supports adding the remaining rooms.

---

# 40. CREATIVE STANDARD

At every design decision ask:

Does this help the visitor understand the architecture?

Does this make the experience calmer?

Does this strengthen the story?

Does this improve conversion without damaging the premium feeling?

If not, remove it.

Prefer fewer excellent moments over many effects.

---

# 41. IMPORTANT IMPLEMENTATION BEHAVIOR

Do not stop after producing a planning document.

After documentation is created, begin implementing Phase 1.

Do not repeatedly ask for clarification.

When information is missing:

choose the most reasonable production-quality default and document the assumption.

Do not fake unavailable brand information.

Do not use paid dependencies or assets when a free alternative can achieve the goal.

Do not over-engineer backend functionality that is not needed.

Focus first on the complete cinematic frontend vertical slice.

---

# 42. FIRST EXECUTION TASK

Start by inspecting the existing repository.

If the repository is empty:

initialize the appropriate Next.js TypeScript project.

Then:

1. create the documentation listed above
2. establish the project architecture
3. establish bilingual routing/content
4. build the UI shell
5. create the 3D experience foundation
6. implement the story configuration system
7. implement the spline camera
8. implement Exterior
9. implement Entrance
10. implement Living Room
11. implement Garden
12. implement hotspots
13. implement final CTA
14. implement adaptive quality
15. implement reduced-motion and WebGL fallbacks
16. test
17. document how to run, modify, and extend the project

The end result should feel like an architectural film that the visitor controls with their scroll.

The website should make visitors think:

**“Tôi muốn HavenArt thiết kế ngôi nhà của mình.”**

without the website ever needing to say that explicitly.