export interface Artwork {
  id: string;
  title: string;
  artist: string;
  src: string;
  license: string;
  sourceUrl: string;
  description?: string;
}

export type VisualCredit = {
  id: string;
  title: string;
  artist: string;
  license: string;
  sourceUrl: string;
};

export const CURATED_ARTWORKS: Artwork[] = [
  {
    id: 'haven-art-fuji-morning',
    title: 'Fine Wind, Clear Morning (Red Fuji)',
    artist: 'Katsushika Hokusai',
    src: '/images/artworks/hokusai-red-fuji.webp',
    license: 'Public Domain',
    sourceUrl: 'https://havenart.space/art/hokusai-red-fuji',
    description: 'Serene sunrise over Mount Fuji from the Thirty-Six Views of Mount Fuji series.',
  },
  {
    id: 'haven-art-monet-waterlilies',
    title: 'Water Lilies (Nymphéas)',
    artist: 'Claude Monet',
    src: '/images/artworks/monet-water-lilies.webp',
    license: 'Public Domain',
    sourceUrl: 'https://havenart.space/art/monet-water-lilies',
    description: 'Gentle, meditative reflections on water with blooming lilies at Giverny.',
  },
  {
    id: 'haven-art-hasui-lake-chuzenji',
    title: 'Lake Chūzenji, Nikkō',
    artist: 'Kawase Hasui',
    src: '/images/artworks/hasui-lake-chuzenji.webp',
    license: 'Public Domain',
    sourceUrl: 'https://havenart.space/art/hasui-lake-chuzenji',
    description: 'Tranquil evening mist and still water in traditional shin-hanga style.',
  },
  {
    id: 'haven-art-turner-evening-star',
    title: 'The Evening Star',
    artist: 'J. M. W. Turner',
    src: '/images/artworks/turner-evening-star.webp',
    license: 'Public Domain',
    sourceUrl: 'https://havenart.space/art/turner-evening-star',
    description: 'Quiet dusk on a peaceful shore with faint reflections of the evening star.',
  },
  {
    id: 'haven-art-friedrich-morning-mist',
    title: 'Morning Sun on the Mountains',
    artist: 'Caspar David Friedrich',
    src: '/images/artworks/friedrich-morning-mist.webp',
    license: 'Public Domain',
    sourceUrl: 'https://havenart.space/art/friedrich-morning-mist',
    description: 'Soft atmospheric early light over gentle mountain ridges.',
  },
];

export function getAllArtworks(): Artwork[] {
  return [...CURATED_ARTWORKS];
}

export function getArtworkById(id: string): Artwork | undefined {
  return CURATED_ARTWORKS.find((art) => art.id === id);
}

export function getDefaultArtwork(): Artwork {
  return CURATED_ARTWORKS[0];
}
