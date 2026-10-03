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
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Katsushika_Hokusai_-_Fine_Wind,_Clear_Morning_(Gaif%C5%AB_kaisei)_-_Google_Art_Project.jpg',
    description: 'Serene sunrise over Mount Fuji from the Thirty-Six Views of Mount Fuji series.',
  },
  {
    id: 'haven-art-monet-waterlilies',
    title: 'Water Lilies (Nymphéas)',
    artist: 'Claude Monet',
    src: '/images/artworks/monet-water-lilies.webp',
    license: 'Public Domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Water_Lilies_-_1906,_Ryerson.jpg',
    description: 'Gentle, meditative reflections on water with blooming lilies at Giverny.',
  },
  {
    id: 'haven-art-turner-evening-star',
    title: 'The Evening Star',
    artist: 'J. M. W. Turner',
    src: '/images/artworks/turner-evening-star.webp',
    license: 'Public Domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Turner_-_The_Evening_Star,_about_1830,_NG1991.jpg',
    description: 'Quiet dusk on a peaceful shore with faint reflections of the evening star.',
  },
  {
    id: 'haven-art-friedrich-morning-mist',
    title: 'Morning Sun on the Mountains',
    artist: 'Caspar David Friedrich',
    src: '/images/artworks/friedrich-morning-mist.webp',
    license: 'Public Domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Caspar_David_Friedrich_-_Morgennebel_im_Gebirge.jpg',
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
