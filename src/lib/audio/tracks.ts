export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  license: string;
  sourceUrl: string;
  durationSeconds: number;
  src: string;
}

export const DEFAULT_TRACKS: AudioTrack[] = [
  {
    id: 'haven-ambient-morning',
    title: 'Morning Mist',
    artist: 'Haven Soundscapes',
    license: 'CC0 1.0 Universal / Public Domain',
    sourceUrl: 'https://havenart.space/media-provenance',
    durationSeconds: 36,
    src: '/audio/morning-mist.mp3',
  },
  {
    id: 'haven-ambient-solitude',
    title: 'Serene Solitude',
    artist: 'Haven Soundscapes',
    license: 'CC0 1.0 Universal / Public Domain',
    sourceUrl: 'https://havenart.space/media-provenance',
    durationSeconds: 36,
    src: '/audio/serene-solitude.mp3',
  },
  {
    id: 'haven-ambient-nightfall',
    title: 'Gentle Nightfall',
    artist: 'Haven Soundscapes',
    license: 'CC0 1.0 Universal / Public Domain',
    sourceUrl: 'https://havenart.space/media-provenance',
    durationSeconds: 36,
    src: '/audio/gentle-nightfall.mp3',
  },
];

export function getAllTracks(): AudioTrack[] {
  return [...DEFAULT_TRACKS];
}

export function getTrackById(id: string): AudioTrack | undefined {
  return DEFAULT_TRACKS.find((track) => track.id === id);
}

export function getDefaultTrack(): AudioTrack {
  return DEFAULT_TRACKS[0];
}
