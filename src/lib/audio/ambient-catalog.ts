import type { AudioTrack } from './tracks';
import { DEFAULT_TRACKS } from './tracks';
import type { WeatherCondition, TimeOfDay } from '../weather/weather';

export interface HavenAudioTrack extends AudioTrack {
  weather: WeatherCondition[];
  moods: string[];
  timeOfDay: TimeOfDay[];
  genreVi: string;
  category: 'piano' | 'ambient';
}

/**
 * Curated Haven Art Ambient & Classical Piano Catalog
 * Includes serene ambient soundscapes and soulful acoustic piano masterpieces.
 */
export const ALL_HAVEN_AUDIO_TRACKS: HavenAudioTrack[] = [
  // --- 1. PIANO SOLO & LYRICAL PIANO MASTERPIECES ---
  {
    id: 'haven-piano-kiss-the-rain',
    title: 'Kiss the Rain',
    artist: 'Yiruma (Official Studio Recording)',
    license: 'Promotional / Archival Studio Solo',
    sourceUrl: 'https://archive.org/details/yiruma-solo',
    durationSeconds: 256,
    src: '/audio/kiss-the-rain.mp3',
    weather: ['rain', 'clouds', 'dusk'],
    moods: ['reflective', 'calm', 'peaceful'],
    timeOfDay: ['day', 'dusk', 'night'],
    genreVi: 'Độc tấu Piano — Giai điệu mưa rơi trầm tư',
    category: 'piano',
  },
  {
    id: 'haven-piano-river-flows',
    title: 'River Flows in You',
    artist: 'Yiruma (Official Studio Recording)',
    license: 'Promotional / Archival Studio Solo',
    sourceUrl: 'https://archive.org/details/yiruma-solo',
    durationSeconds: 218,
    src: '/audio/river-flows.mp3',
    weather: ['clear'],
    moods: ['hopeful', 'grateful', 'peaceful'],
    timeOfDay: ['dawn', 'day'],
    genreVi: 'Độc tấu Piano — Dòng sông hy vọng êm đềm',
    category: 'piano',
  },
  {
    id: 'haven-piano-spring-waltz',
    title: 'Spring Waltz',
    artist: 'Yiruma (Official Studio Recording)',
    license: 'Promotional / Archival Studio Solo',
    sourceUrl: 'https://archive.org/details/yiruma-solo',
    durationSeconds: 236,
    src: '/audio/spring-waltz.mp3',
    weather: ['clear', 'clouds', 'dusk'],
    moods: ['calm', 'hopeful', 'peaceful'],
    timeOfDay: ['dawn', 'day', 'dusk'],
    genreVi: 'Độc tấu Piano — Bản Valse mùa xuân êm dịu',
    category: 'piano',
  },
  {
    id: 'haven-piano-destiny-of-love',
    title: 'Destiny of Love',
    artist: 'Yiruma (Official Studio Recording)',
    license: 'Promotional / Archival Studio Solo',
    sourceUrl: 'https://archive.org/details/yiruma-solo',
    durationSeconds: 284,
    src: '/audio/destiny-of-love.mp3',
    weather: ['dusk', 'night', 'rain'],
    moods: ['reflective', 'grateful', 'peaceful'],
    timeOfDay: ['dusk', 'night'],
    genreVi: 'Độc tấu Piano — Định mệnh tình yêu da diết',
    category: 'piano',
  },
  {
    id: 'haven-piano-if-i-could-see-you-again',
    title: 'If I Could See You Again',
    artist: 'Yiruma (Official Studio Recording)',
    license: 'Promotional / Archival Studio Solo',
    sourceUrl: 'https://archive.org/details/yiruma-solo',
    durationSeconds: 215,
    src: '/audio/if-i-could-see-you-again.mp3',
    weather: ['rain', 'clouds', 'fog'],
    moods: ['reflective', 'calm'],
    timeOfDay: ['dusk', 'night'],
    genreVi: 'Độc tấu Piano — Hoài niệm sâu lắng',
    category: 'piano',
  },
  {
    id: 'haven-piano-gymnopedie-no1',
    title: 'Gymnopédie No. 1',
    artist: 'Erik Satie (Acoustic Grand Piano)',
    license: 'Public Domain / CC0',
    sourceUrl: 'https://archive.org/details/gymnopedie-1-erik-satie-176573_202506',
    durationSeconds: 235,
    src: '/audio/gymnopedie-no1.mp3',
    weather: ['fog', 'clouds', 'clear'],
    moods: ['calm', 'reflective', 'peaceful'],
    timeOfDay: ['dawn', 'day', 'night'],
    genreVi: 'Độc tấu Piano — Khúc Valse tĩnh lặng vô ưu',
    category: 'piano',
  },
  {
    id: 'haven-piano-clair-de-lune',
    title: 'Clair de Lune',
    artist: 'Claude Debussy (Acoustic Grand Piano)',
    license: 'Public Domain / CC0',
    sourceUrl: 'https://archive.org/details/clair-de-lune_202408',
    durationSeconds: 280,
    src: '/audio/clair-de-lune.mp3',
    weather: ['night', 'dusk'],
    moods: ['peaceful', 'calm', 'grateful'],
    timeOfDay: ['night', 'dusk'],
    genreVi: 'Độc tấu Piano — Ánh trăng huyền ảo an yên',
    category: 'piano',
  },

  // --- 2. AMBIENT SOUNDSCAPES & MEDITATION HARMONICS ---
  {
    id: 'haven-ambient-morning',
    title: 'Morning Mist',
    artist: 'Haven Soundscapes',
    license: 'CC0 1.0 Universal / Public Domain',
    sourceUrl: 'https://havenart.space/audio/morning-mist',
    durationSeconds: 180,
    src: '/audio/morning-mist.mp3',
    weather: ['fog', 'clear'],
    moods: ['calm', 'hopeful', 'grateful'],
    timeOfDay: ['dawn', 'day'],
    genreVi: 'Âm hưởng sương sớm thanh khiết',
    category: 'ambient',
  },
  {
    id: 'haven-ambient-rain-solace',
    title: 'Raindrop Solace',
    artist: 'Haven Soundscapes',
    license: 'CC0 1.0 Universal / Public Domain',
    sourceUrl: 'https://havenart.space/audio/rain-solace',
    durationSeconds: 210,
    src: '/audio/rain-solace.mp3',
    weather: ['rain', 'clouds'],
    moods: ['reflective', 'calm', 'peaceful'],
    timeOfDay: ['day', 'dusk', 'night'],
    genreVi: 'Tiếng mưa rơi an trú và suy ngẫm',
    category: 'ambient',
  },
  {
    id: 'haven-ambient-solitude',
    title: 'Serene Solitude',
    artist: 'Haven Soundscapes',
    license: 'CC0 1.0 Universal / Public Domain',
    sourceUrl: 'https://havenart.space/audio/serene-solitude',
    durationSeconds: 210,
    src: '/audio/serene-solitude.mp3',
    weather: ['clouds', 'fog'],
    moods: ['reflective', 'peaceful', 'calm'],
    timeOfDay: ['day', 'dusk'],
    genreVi: 'Khoảng lặng chiêm nghiệm nội tâm',
    category: 'ambient',
  },
  {
    id: 'haven-ambient-golden-dusk',
    title: 'Golden Dusk',
    artist: 'Haven Soundscapes',
    license: 'CC0 1.0 Universal / Public Domain',
    sourceUrl: 'https://havenart.space/audio/golden-dusk',
    durationSeconds: 210,
    src: '/audio/golden-dusk.mp3',
    weather: ['dusk', 'clear'],
    moods: ['grateful', 'peaceful', 'reflective'],
    timeOfDay: ['dusk'],
    genreVi: 'Giai điệu ráng chiều ấm áp',
    category: 'ambient',
  },
  {
    id: 'haven-ambient-nightfall',
    title: 'Gentle Nightfall',
    artist: 'Haven Soundscapes',
    license: 'CC0 1.0 Universal / Public Domain',
    sourceUrl: 'https://havenart.space/audio/gentle-nightfall',
    durationSeconds: 240,
    src: '/audio/gentle-nightfall.mp3',
    weather: ['night'],
    moods: ['calm', 'peaceful', 'reflective'],
    timeOfDay: ['night'],
    genreVi: 'Khúc ru đêm tĩnh mịch an giấc',
    category: 'ambient',
  },
  {
    id: 'haven-ambient-zen-garden',
    title: 'Zen Garden',
    artist: 'Haven Soundscapes',
    license: 'CC0 1.0 Universal / Public Domain',
    sourceUrl: 'https://havenart.space/audio/zen-garden',
    durationSeconds: 210,
    src: '/audio/zen-garden.mp3',
    weather: ['clear', 'clouds', 'fog'],
    moods: ['peaceful', 'calm', 'grateful'],
    timeOfDay: ['day', 'dawn'],
    genreVi: 'Vườn thiền chuông ngân thanh tịnh',
    category: 'ambient',
  },
  {
    id: 'haven-ambient-hopeful-dawn',
    title: 'Hopeful Dawn',
    artist: 'Haven Soundscapes',
    license: 'CC0 1.0 Universal / Public Domain',
    sourceUrl: 'https://havenart.space/audio/hopeful-dawn',
    durationSeconds: 210,
    src: '/audio/hopeful-dawn.mp3',
    weather: ['clear'],
    moods: ['hopeful', 'grateful'],
    timeOfDay: ['dawn', 'day'],
    genreVi: 'Bình minh hé rạng ngập tràn hy vọng',
    category: 'ambient',
  },
];

export function getPianoTracks(): HavenAudioTrack[] {
  return ALL_HAVEN_AUDIO_TRACKS.filter((t) => t.category === 'piano');
}

export function getAmbientTracks(): HavenAudioTrack[] {
  return ALL_HAVEN_AUDIO_TRACKS.filter((t) => t.category === 'ambient');
}

export function getAllHavenAudioTracks(): HavenAudioTrack[] {
  return [...ALL_HAVEN_AUDIO_TRACKS];
}

export function getDefaultHavenAudioTrack(): HavenAudioTrack {
  return ALL_HAVEN_AUDIO_TRACKS[0];
}
