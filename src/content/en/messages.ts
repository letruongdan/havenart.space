/**
 * HavenArt — English Content Dictionary (EN)
 * Contract Version: havenart-contracts-1.1
 */

import type { Dictionary } from '@/types/story';

export const enMessages: Dictionary = {
  brand: {
    name: 'HavenArt',
    tagline: 'Designing the place you belong.',
    supporting: 'A home begins with how you wish to live.',
    conceptLabel: 'An illustrative architectural concept',
  },
  navigation: {
    skipContent: 'Skip to main content',
    skipContact: 'Skip to contact section',
    languageLabel: 'Language',
  },
  controls: {
    start: 'Begin Exploration',
    staticMode: 'View static content',
    enableSound: 'Enable sound',
    muteSound: 'Mute sound',
    closeDetails: 'Close details',
    progressLabel: 'Spatial Journey Progress',
  },
  services: {
    title: 'Residential Architecture Direction',
    description:
      'HavenArt partners with homeowners to craft spaces rooted in everyday rituals, with an emphasis on natural illumination, microclimate comfort, and timeless material integrity.',
  },
  chapters: {
    exterior: {
      title: 'Designing the place you belong.',
      story:
        'A contemporary tropical home defined by clean architectural volumes, sheltered by lush foliage and bathed in low late-afternoon sun.',
      intention:
        'Establish a tranquil dialogue between built form and native landscape, setting a tone of calm privacy from the very first glance.',
      principles: [
        'Contemporary tropical minimalism geometry',
        'Balanced proportions tailored to landscape',
        'Green buffer layers reducing solar heat gain',
      ],
      materials: 'Hand-finished cast concrete, textured mineral plaster, weathered teak, and native flora.',
      light: 'Warm low-angle sun casting soft, elongated shadows across articulated planes.',
      imageAlt: 'Overall view of HavenArt contemporary villa in warm late afternoon sunlight.',
    },
    approach: {
      title: 'Architecture begins before the threshold.',
      story:
        'The approach path gently compresses between a stone wall and leafy canopy, creating a mindful pause before entering the private realm.',
      intention:
        'Provide a sensory decompression zone, allowing residents to leave exterior noise behind and settle into a calmer pace.',
      principles: [
        'Circulation guided by light and natural shadow',
        'Screening walls ensuring foyer privacy',
        'Architectural setback honoring daily life rituals',
      ],
      materials: 'Natural stone paving, textured render walls, and open timber louvers.',
      light: 'Dappled shade interspersed with gentle light filtering through overhead leaves.',
      imageAlt: 'Approach walkway toward the main portico framed by shade trees.',
    },
    entrance: {
      title: 'Step into a calmer rhythm.',
      story:
        'Crossing the threshold, a subtly lowered ceiling creates an immediate sense of shelter before the gaze expands across the living room to the garden beyond.',
      intention:
        'Transition smoothly from outside to inside, opening a transparent visual axis connecting directly to the garden.',
      principles: [
        'Deliberate architectural threshold setting a serene posture',
        'Spatial compression-expansion generating emotion',
        'Direct sightline connecting interior to greenery',
      ],
      materials: 'Substantial solid timber door, seamless warm-toned terrazzo flooring extending inside.',
      light: 'Soft indirect illumination contrasting subtly with the luminous opening behind the living area.',
      imageAlt: 'Entrance foyer looking through the doorway into the living space.',
    },
    living: {
      title: 'A space designed for connection.',
      story:
        'The living room is arranged as a peaceful sanctuary where family gathers under indirect light, looking out into the garden through wide sliding glass doors.',
      intention:
        'Prioritize family togetherness and fluid indoor-outdoor connection, doing away with redundant partitions.',
      principles: [
        'Open layout maximizing garden visual connectivity',
        'Indirect ambient illumination fostering relaxation',
        'Honest tactile materials providing sensory richness',
      ],
      materials: 'Warm natural travertine feature wall, neutral linen upholstery, white oak, and clear glass panels.',
      light: 'Sunset light grazing horizontally through glass, blending with warm discreet lighting on textured stone.',
      imageAlt: 'Warm living room featuring travertine wall and sliding glass framing the garden.',
    },
    garden: {
      title: 'Architecture gives space back to nature.',
      story:
        'Gliding past open glass panels leads out to the terrace and garden, where gentle breezes and leafy canopies shelter moments of quiet respite.',
      intention:
        'Dissolve the boundary between interior and landscape, welcoming living nature as an integral dimension of domestic life.',
      principles: [
        'Flush zero-threshold transition between floor and terrace',
        'Shading canopy naturally cooling the living envelope',
        'Cross-ventilation aperture welcoming ambient breeze',
      ],
      materials: 'Non-slip earth-toned terrace paving, river pebbles, rich soil, and lush lawn.',
      light: 'Cooling dusk sky outside balancing the warm glow spilling outward from within the residence.',
      imageAlt: 'Rear garden with outdoor terrace and verdant trees under evening dusk light.',
    },
    finale: {
      title: 'Your home should tell your story.',
      story:
        'A complete architectural home is one where every proportion and texture is thoughtfully orchestrated to support your peace of mind.',
      intention:
        'We invite you to engage in an honest dialogue with HavenArt architects to shape a home that truly belongs to you.',
      principles: [
        'Listening first and beginning with real lifestyle rituals',
        'Balanced harmony between refined aesthetics and function',
        'Respecting the distinct individuality of each homeowner',
      ],
      materials: 'Holistic interplay of stone, timber, glass, water, and tropical foliage.',
      light: 'The residence illuminated like a warm lantern at dusk, revealing an enduring sanctuary.',
      imageAlt: 'Panoramic dusk view of HavenArt residence glowing softly in the garden setting.',
    },
  },
  hotspots: {
    'travertine-wall': {
      title: 'Travertine wall',
      categoryLabel: 'Material',
      description: 'Warm natural stone brings depth and character to the living space under indirect light.',
      rationale:
        'In this concept, the inherent texture of stone provides visual richness without the need for superficial decoration.',
      insight: 'Natural stone absorbs heat slowly during the day, gently moderating ambient indoor temperatures.',
      triggerLabel: 'Explore travertine wall detail',
    },
    'sliding-glass': {
      title: 'Sliding glass system',
      categoryLabel: 'Architecture',
      description: 'A generous opening links interior seating with the outdoor terrace and garden.',
      rationale:
        'The sliding glass panels frame greenery while revealing an unobstructed path between inside and outside.',
      insight: 'Concealed aluminum subframes maximize glass area, inviting natural illumination and cross-ventilation.',
      triggerLabel: 'Explore sliding glass system detail',
    },
    'garden-tree': {
      title: 'Garden tree',
      categoryLabel: 'Landscape',
      description: 'A sheltering canopy offers cooling shade and a restful focal point from the living room.',
      rationale:
        'The tree is intentionally positioned to anchor the transition between indoor living and outdoor pause.',
      insight: 'Seasonal canopy density moderates the angle and intensity of solar exposure throughout the year.',
      triggerLabel: 'Explore garden tree landscape detail',
    },
  },
  contact: {
    title: 'Talk to an Architect',
    description:
      'Begin an authentic conversation with HavenArt architects about your lifestyle aspirations and spatial requirements.',
    cta: 'Talk to an Architect',
    unconfigured: 'Not configured',
    channels: {
      zalo: 'Zalo',
      messenger: 'Messenger',
      whatsapp: 'WhatsApp',
    },
  },
  status: {
    loading: 'Preparing 3D environment...',
    fallback: 'Displaying high-compatibility static experience',
    audioLoading: 'Loading ambient audio...',
    audioUnavailable: 'Audio is unavailable on this device',
    audioPaused: 'Audio paused',
  },
  metadata: {
    title: 'HavenArt — Designing the place you belong',
    description:
      'HavenArt — Discover contemporary residential architecture embodying Contemporary Tropical Minimalism through an interactive spatial experience.',
    ogTitle: 'HavenArt — Contemporary Architecture Concept',
    ogDescription:
      'An interactive journey through a contemporary tropical home: natural light, tactile materials, and a profound harmony with nature.',
    ogAlt: 'HavenArt Contemporary Tropical Minimalism Villa Overview',
  },
};
