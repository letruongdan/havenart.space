/**
 * HavenArt — Story & Content Test Fixtures
 * Marked as [TEST-ONLY]; never import into production application code.
 */

import type { Dictionary, Locale, StoryChapter, Hotspot } from '@/types/story';
import { CHAPTERS, PRESET_REGISTRIES, STORY_RESOURCES } from '@/config/story';
import { HOTSPOTS } from '@/config/hotspots';

export function createTestOnlyDictionary(locale: Locale): Dictionary {
  const isVi = locale === 'vi';
  return {
    brand: {
      name: 'HavenArt',
      tagline: isVi ? '[TEST-ONLY] Kiến tạo nơi bạn thuộc về' : '[TEST-ONLY] Designing the place you belong',
      supporting: isVi ? '[TEST-ONLY] Mô hình kiến trúc' : '[TEST-ONLY] Architectural concept',
      conceptLabel: isVi ? '[TEST-ONLY] Không gian minh họa' : '[TEST-ONLY] Concept villa',
    },
    navigation: {
      skipContent: isVi ? 'Đến nội dung' : 'Skip to content',
      skipContact: isVi ? 'Đến phần liên hệ' : 'Skip to contact',
      languageLabel: isVi ? 'Ngôn ngữ' : 'Language',
    },
    controls: {
      start: isVi ? 'Bắt đầu' : 'Start',
      staticMode: isVi ? 'Xem nội dung tĩnh' : 'Static content',
      enableSound: isVi ? 'Bật âm thanh' : 'Enable sound',
      muteSound: isVi ? 'Tắt âm thanh' : 'Mute sound',
      closeDetails: isVi ? 'Đóng chi tiết' : 'Close details',
      progressLabel: isVi ? 'Tiến độ' : 'Progress',
    },
    services: {
      title: isVi ? '[TEST-ONLY] Dịch vụ thiết kế' : '[TEST-ONLY] Design Services',
      description: isVi ? '[TEST-ONLY] Mô tả dịch vụ' : '[TEST-ONLY] Services description',
    },
    chapters: {
      exterior: {
        title: isVi ? 'Ngoại thất' : 'Exterior',
        story: '[TEST-ONLY] Story exterior',
        intention: '[TEST-ONLY] Intention exterior',
        principles: ['[TEST-ONLY] Principle 1', '[TEST-ONLY] Principle 2'],
        materials: '[TEST-ONLY] Materials exterior',
        light: '[TEST-ONLY] Light exterior',
        imageAlt: '[TEST-ONLY] Alt exterior',
      },
      approach: {
        title: isVi ? 'Lối tiếp cận' : 'Approach',
        story: '[TEST-ONLY] Story approach',
        intention: '[TEST-ONLY] Intention approach',
        principles: ['[TEST-ONLY] Principle 1'],
        materials: '[TEST-ONLY] Materials approach',
        light: '[TEST-ONLY] Light approach',
        imageAlt: '[TEST-ONLY] Alt approach',
      },
      entrance: {
        title: isVi ? 'Sảnh đón' : 'Entrance',
        story: '[TEST-ONLY] Story entrance',
        intention: '[TEST-ONLY] Intention entrance',
        principles: ['[TEST-ONLY] Principle 1'],
        materials: '[TEST-ONLY] Materials entrance',
        light: '[TEST-ONLY] Light entrance',
        imageAlt: '[TEST-ONLY] Alt entrance',
      },
      living: {
        title: isVi ? 'Phòng khách' : 'Living Room',
        story: '[TEST-ONLY] Story living',
        intention: '[TEST-ONLY] Intention living',
        principles: ['[TEST-ONLY] Principle 1', '[TEST-ONLY] Principle 2'],
        materials: '[TEST-ONLY] Materials living',
        light: '[TEST-ONLY] Light living',
        imageAlt: '[TEST-ONLY] Alt living',
      },
      garden: {
        title: isVi ? 'Khu vườn' : 'Garden',
        story: '[TEST-ONLY] Story garden',
        intention: '[TEST-ONLY] Intention garden',
        principles: ['[TEST-ONLY] Principle 1'],
        materials: '[TEST-ONLY] Materials garden',
        light: '[TEST-ONLY] Light garden',
        imageAlt: '[TEST-ONLY] Alt garden',
      },
      finale: {
        title: isVi ? 'Toàn cảnh' : 'Finale',
        story: '[TEST-ONLY] Story finale',
        intention: '[TEST-ONLY] Intention finale',
        principles: ['[TEST-ONLY] Principle 1'],
        materials: '[TEST-ONLY] Materials finale',
        light: '[TEST-ONLY] Light finale',
        imageAlt: '[TEST-ONLY] Alt finale',
      },
    },
    hotspots: {
      'travertine-wall': {
        title: isVi ? 'Tường đá travertine' : 'Travertine wall',
        categoryLabel: isVi ? 'Vật liệu' : 'Material',
        description: '[TEST-ONLY] Travertine wall desc',
        rationale: '[TEST-ONLY] Travertine wall rationale',
        insight: '[TEST-ONLY] Travertine wall insight',
        triggerLabel: isVi ? 'Xem tường đá' : 'View travertine wall',
      },
      'sliding-glass': {
        title: isVi ? 'Hệ cửa kính trượt' : 'Sliding glass system',
        categoryLabel: isVi ? 'Kiến trúc' : 'Architecture',
        description: '[TEST-ONLY] Sliding glass desc',
        rationale: '[TEST-ONLY] Sliding glass rationale',
        insight: '[TEST-ONLY] Sliding glass insight',
        triggerLabel: isVi ? 'Xem cửa kính' : 'View sliding glass',
      },
      'garden-tree': {
        title: isVi ? 'Cây trong vườn' : 'Garden tree',
        categoryLabel: isVi ? 'Cảnh quan' : 'Landscape',
        description: '[TEST-ONLY] Garden tree desc',
        rationale: '[TEST-ONLY] Garden tree rationale',
        insight: '[TEST-ONLY] Garden tree insight',
        triggerLabel: isVi ? 'Xem cây trong vườn' : 'View garden tree',
      },
    },
    contact: {
      title: isVi ? 'Liên hệ kiến trúc sư' : 'Talk to an Architect',
      description: isVi ? 'Trao đổi về nhu cầu thiết kế thực tế của bạn.' : 'Discuss your architectural vision with our studio.',
      cta: isVi ? 'Liên hệ kiến trúc sư' : 'Talk to an Architect',
      unconfigured: isVi ? 'Chưa cấu hình' : 'Unconfigured',
      channels: {
        zalo: 'Zalo',
        messenger: 'Messenger',
        whatsapp: 'WhatsApp',
      },
    },
    status: {
      loading: isVi ? 'Đang chuẩn bị không gian...' : 'Preparing space...',
      fallback: isVi ? 'Đang hiển thị bản nội dung tĩnh' : 'Displaying static content',
      audioLoading: isVi ? 'Đang tải âm thanh...' : 'Loading audio...',
      audioUnavailable: isVi ? 'Âm thanh chưa khả dụng' : 'Audio unavailable',
      audioPaused: isVi ? 'Âm thanh tạm dừng' : 'Audio paused',
    },
    metadata: {
      title: isVi ? 'HavenArt — Kiến tạo nơi bạn thuộc về' : 'HavenArt — Designing the place you belong',
      description: isVi ? 'Không gian ý tưởng kiến trúc Contemporary Tropical Minimalism.' : 'Contemporary Tropical Minimalism architectural concept.',
      ogTitle: isVi ? 'HavenArt — Không gian kiến trúc đương đại' : 'HavenArt — Contemporary Architecture Concept',
      ogDescription: isVi ? 'Khám phá hành trình không gian sống tinh tế.' : 'Explore an architectural journey.',
      ogAlt: isVi ? 'HavenArt Villa Concept' : 'HavenArt Villa Concept',
    },
  };
}

export const validStoryValidationInput = {
  chapters: CHAPTERS,
  hotspots: HOTSPOTS,
  registries: {
    lighting: PRESET_REGISTRIES.lighting,
    audio: PRESET_REGISTRIES.audio,
    zones: PRESET_REGISTRIES.zones,
    posters: PRESET_REGISTRIES.posters,
  },
  resources: STORY_RESOURCES,
  localeKeys: {
    vi: [
      'chapters.exterior',
      'chapters.approach',
      'chapters.entrance',
      'chapters.living',
      'chapters.garden',
      'chapters.finale',
      'hotspots.travertine-wall',
      'hotspots.sliding-glass',
      'hotspots.garden-tree',
    ],
    en: [
      'chapters.exterior',
      'chapters.approach',
      'chapters.entrance',
      'chapters.living',
      'chapters.garden',
      'chapters.finale',
      'hotspots.travertine-wall',
      'hotspots.sliding-glass',
      'hotspots.garden-tree',
    ],
  },
} as const;

export const invalidChaptersGap: readonly StoryChapter[] = [
  { ...CHAPTERS[0], progressEnd: 0.12 },
  ...CHAPTERS.slice(1),
];

export const invalidChaptersOverlap: readonly StoryChapter[] = [
  { ...CHAPTERS[0], progressEnd: 0.20 },
  ...CHAPTERS.slice(1),
];

export const invalidHotspotsRange: readonly Hotspot[] = [
  { ...HOTSPOTS[0], activationRange: [0.9, 0.1] },
];
