import type { AudioTrack } from './tracks';
import { DEFAULT_TRACKS } from './tracks';
import type { WeatherCondition, TimeOfDay } from '../weather/weather';

export interface HavenAudioTrack extends AudioTrack {
  weather: WeatherCondition[];
  moods: string[];
  timeOfDay: TimeOfDay[];
  genreVi: string;
}

/**
 * Curated Haven Art Ambient Soundscapes Catalog
 * Seamless, tranquil, non-intrusive soundscapes tagged by weather, mood and time of day.
 * All tracks are licensed CC0 / Public Domain.
 */
export const ALL_HAVEN_AUDIO_TRACKS: HavenAudioTrack[] = [
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
  },
];

export function getAllHavenAudioTracks(): HavenAudioTrack[] {
  return [...ALL_HAVEN_AUDIO_TRACKS];
}

export function getDefaultHavenAudioTrack(): HavenAudioTrack {
  return ALL_HAVEN_AUDIO_TRACKS[0];
}
