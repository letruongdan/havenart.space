import type { Artwork } from './artworks';
import { CURATED_ARTWORKS } from './artworks';
import type { WeatherCondition, TimeOfDay } from '../weather/weather';

export interface HavenArtwork extends Artwork {
  weather: WeatherCondition[];
  moods: string[];
  timeOfDay: TimeOfDay[];
  isPexels?: boolean;
}

/**
 * Curated Pexels Haven Art Collection
 * High-resolution (1920px), serene photography under Pexels License.
 * Tags allow smart adaptation to local weather, time of day, and user mood.
 */
export const PEXELS_HAVEN_ARTWORKS: HavenArtwork[] = [
  {
    id: 'pexels-misty-mountain-lake',
    title: 'Hồ tĩnh lặng mờ sương ban mai',
    artist: 'Pexels / Eberhard Grossgasteiger',
    src: 'https://images.pexels.com/photos/1421903/pexels-photo-1421903.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/1421903/',
    description: 'Màn sương sớm nhẹ nhàng buông trên mặt hồ xanh biếc giữa những rặng núi tĩnh lặng.',
    weather: ['fog', 'clear'],
    moods: ['calm', 'peaceful', 'reflective'],
    timeOfDay: ['dawn', 'day'],
    isPexels: true,
  },
  {
    id: 'pexels-rain-window-trees',
    title: 'Mưa rơi êm dịu bên hiên vắng',
    artist: 'Pexels / Kaique Rocha',
    src: 'https://images.pexels.com/photos/125510/pexels-photo-125510.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/125510/',
    description: 'Những giọt mưa long lanh trên ô cửa sổ, mang lại cảm giác an trú và bình yên sâu thẳm.',
    weather: ['rain', 'clouds'],
    moods: ['reflective', 'calm'],
    timeOfDay: ['day', 'dusk', 'night'],
    isPexels: true,
  },
  {
    id: 'pexels-pine-forest-mist',
    title: 'Rừng thông bảng lảng trong sương',
    artist: 'Pexels / Johannes Plenio',
    src: 'https://images.pexels.com/photos/1428277/pexels-photo-1428277.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/1428277/',
    description: 'Hàng ngàn cây thông hòa vào làn sương trắng mờ ảo giữa núi đồi sớm mai.',
    weather: ['fog', 'clouds'],
    moods: ['calm', 'peaceful'],
    timeOfDay: ['dawn', 'day'],
    isPexels: true,
  },
  {
    id: 'pexels-golden-ocean-sunset',
    title: 'Sóng vỗ êm đềm chiều hoàng hôn',
    artist: 'Pexels / Pok Rie',
    src: 'https://images.pexels.com/photos/157879/pexels-photo-157879.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/157879/',
    description: 'Sóng biển mềm mại đón nhận ánh nắng hoàng hôn ấm áp dát vàng bờ cát.',
    weather: ['dusk', 'clear'],
    moods: ['grateful', 'hopeful', 'peaceful'],
    timeOfDay: ['dusk'],
    isPexels: true,
  },
  {
    id: 'pexels-starry-night-sky',
    title: 'Trời đêm tĩnh mịch ngàn sao',
    artist: 'Pexels / Tobias Bjørkli',
    src: 'https://images.pexels.com/photos/1693095/pexels-photo-1693095.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/1693095/',
    description: 'Dải ngân hà rực rỡ trong sự tĩnh lặng vô tận của màn đêm bao la.',
    weather: ['night', 'clear'],
    moods: ['reflective', 'calm', 'peaceful'],
    timeOfDay: ['night'],
    isPexels: true,
  },
  {
    id: 'pexels-sunbeams-forest',
    title: 'Tia nắng mai xuyên qua kẽ lá',
    artist: 'Pexels / Sebastian Voortman',
    src: 'https://images.pexels.com/photos/21492/pexels-photo-21492.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/21492/',
    description: 'Từng vạt nắng mai xuyên qua tán rừng sương sớm, mang đến năng lượng tươi mới và hy vọng.',
    weather: ['clear', 'fog'],
    moods: ['hopeful', 'grateful'],
    timeOfDay: ['dawn', 'day'],
    isPexels: true,
  },
  {
    id: 'pexels-lake-mirror-reflection',
    title: 'Gương hồ soi bóng mây trời',
    artist: 'Pexels / Luca Bravo',
    src: 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/417074/',
    description: 'Mặt nước phẳng lặng như gương phản chiếu bầu trời quang đãng và núi xanh ngắt.',
    weather: ['clear', 'clouds'],
    moods: ['peaceful', 'calm'],
    timeOfDay: ['day'],
    isPexels: true,
  },
  {
    id: 'pexels-rain-green-hills',
    title: 'Mưa phùn vương đồi xanh ngát',
    artist: 'Pexels / Quang Nguyen Vinh',
    src: 'https://images.pexels.com/photos/2132180/pexels-photo-2132180.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/2132180/',
    description: 'Đồi chè xanh mướt tắm mình trong làn mưa dịu dàng và sương khói mờ ảo.',
    weather: ['rain', 'fog', 'clouds'],
    moods: ['calm', 'reflective'],
    timeOfDay: ['day', 'dawn'],
    isPexels: true,
  },
  {
    id: 'pexels-pier-sunset-tranquil',
    title: 'Cầu gỗ đón ánh ráng chiều',
    artist: 'Pexels / Pok Rie',
    src: 'https://images.pexels.com/photos/132037/pexels-photo-132037.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/132037/',
    description: 'Chiếc cầu gỗ mộc mạc vươn ra mặt nước bình lặng trong buổi chiều tà rực rỡ sắc cam.',
    weather: ['dusk', 'clear'],
    moods: ['reflective', 'peaceful'],
    timeOfDay: ['dusk'],
    isPexels: true,
  },
  {
    id: 'pexels-moonlight-still-water',
    title: 'Ánh trăng dịu êm trên sóng nước',
    artist: 'Pexels / Felix Mittermeier',
    src: 'https://images.pexels.com/photos/956999/pexels-photo-956999.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/956999/',
    description: 'Vầng trăng thanh tịnh tỏa ánh sáng vỗ về mặt biển đêm an tĩnh.',
    weather: ['night'],
    moods: ['calm', 'peaceful'],
    timeOfDay: ['night'],
    isPexels: true,
  },
  {
    id: 'pexels-wildflower-dawn-sun',
    title: 'Cánh đồng hoa sớm ngập tràn hy vọng',
    artist: 'Pexels / Valiphotos',
    src: 'https://images.pexels.com/photos/589840/pexels-photo-589840.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/589840/',
    description: 'Những đóa hoa dại đón ánh bình minh, khơi dậy niềm tin yêu và cảm giác biết ơn cuộc sống.',
    weather: ['clear'],
    moods: ['hopeful', 'grateful'],
    timeOfDay: ['dawn', 'day'],
    isPexels: true,
  },
  {
    id: 'pexels-zen-bamboo-grove',
    title: 'Rừng trúc xanh an nhiên',
    artist: 'Pexels / Tom Fisk',
    src: 'https://images.pexels.com/photos/2166559/pexels-photo-2166559.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/2166559/',
    description: 'Lối đi mộc mạc giữa rừng trúc cao vút, không gian thiền định thuần khiết.',
    weather: ['clear', 'clouds', 'fog'],
    moods: ['calm', 'peaceful'],
    timeOfDay: ['day'],
    isPexels: true,
  },
  {
    id: 'pexels-cloud-sea-mountain',
    title: 'Biển mây bồng bềnh miền non cao',
    artist: 'Pexels / Simon Berger',
    src: 'https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/1323550/',
    description: 'Biển mây trắng xóa trôi lững lờ trên những rặng núi cao dưới bầu trời xanh bao la.',
    weather: ['clouds', 'fog'],
    moods: ['reflective', 'peaceful', 'hopeful'],
    timeOfDay: ['dawn', 'day'],
    isPexels: true,
  },
  {
    id: 'pexels-autumn-forest-stream',
    title: 'Dòng suối êm trôi mùa lá thu',
    artist: 'Pexels / James Wheeler',
    src: 'https://images.pexels.com/photos/1534057/pexels-photo-1534057.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/1534057/',
    description: 'Làn nước suối trong vắt róc rách luồn qua những tảng đá rêu phong giữa sắc thu rực rỡ.',
    weather: ['clear', 'clouds'],
    moods: ['grateful', 'calm', 'peaceful'],
    timeOfDay: ['day'],
    isPexels: true,
  },
  {
    id: 'pexels-winter-snow-silence',
    title: 'Tuyết trắng bao phủ không gian tĩnh lặng',
    artist: 'Pexels / Pixabay',
    src: 'https://images.pexels.com/photos/60597/pexels-photo-60597.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/60597/',
    description: 'Cành cây đọng tuyết trắng ngần trong bầu không khí trong trẻo, tịch mịch mùa đông.',
    weather: ['snow', 'clouds'],
    moods: ['calm', 'peaceful', 'reflective'],
    timeOfDay: ['dawn', 'day'],
    isPexels: true,
  },
  {
    id: 'pexels-rainy-night-bokeh',
    title: 'Ánh đèn phố đêm trong mưa dịu',
    artist: 'Pexels / Aleksandr Neplokhov',
    src: 'https://images.pexels.com/photos/1198507/pexels-photo-1198507.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/1198507/',
    description: 'Ánh đèn vàng lung linh qua làn mưa đêm, tạo nên một góc ấm áp để suy ngẫm.',
    weather: ['rain', 'night'],
    moods: ['reflective', 'calm'],
    timeOfDay: ['night'],
    isPexels: true,
  },
  {
    id: 'pexels-zen-lotus-pond',
    title: 'Bông sen thanh tịnh giữa hồ an yên',
    artist: 'Pexels / Hong Nguyen',
    src: 'https://images.pexels.com/photos/209065/pexels-photo-209065.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/209065/',
    description: 'Đóa sen hồng tao nhã vươn lên giữa tán lá xanh ngọc, biểu tượng của sự thuần khiết.',
    weather: ['clear', 'clouds', 'rain'],
    moods: ['peaceful', 'calm', 'grateful'],
    timeOfDay: ['day', 'dawn'],
    isPexels: true,
  },
  {
    id: 'pexels-pastel-dusk-horizon',
    title: 'Ráng chiều dịu ngọt chân trời',
    artist: 'Pexels / Billel Moula',
    src: 'https://images.pexels.com/photos/534164/pexels-photo-534164.jpeg?auto=compress&cs=tinysrgb&w=1920',
    license: 'Pexels License (Free to use)',
    sourceUrl: 'https://www.pexels.com/photo/534164/',
    description: 'Dải màu pastel hồng tím mềm mại chuyển dần sang đêm muộn nơi cuối chân trời.',
    weather: ['dusk'],
    moods: ['reflective', 'grateful'],
    timeOfDay: ['dusk'],
    isPexels: true,
  },
];

/**
 * Mapping classical masterpieces with weather and mood tags
 */
export const CLASSICAL_HAVEN_ARTWORKS: HavenArtwork[] = [
  {
    ...CURATED_ARTWORKS[0], // Hokusai Red Fuji
    weather: ['clear'],
    moods: ['hopeful', 'grateful'],
    timeOfDay: ['dawn', 'day'],
    isPexels: false,
  },
  {
    ...CURATED_ARTWORKS[1], // Monet Water Lilies
    weather: ['clear', 'clouds'],
    moods: ['calm', 'peaceful'],
    timeOfDay: ['day'],
    isPexels: false,
  },
  {
    ...CURATED_ARTWORKS[2], // Hasui Lake Chūzenji
    weather: ['fog', 'clouds', 'dusk'],
    moods: ['reflective', 'calm'],
    timeOfDay: ['dusk', 'dawn'],
    isPexels: false,
  },
  {
    ...CURATED_ARTWORKS[3], // Turner Evening Star
    weather: ['dusk', 'night'],
    moods: ['reflective', 'peaceful'],
    timeOfDay: ['dusk', 'night'],
    isPexels: false,
  },
  {
    ...CURATED_ARTWORKS[4], // Friedrich Morning Mist
    weather: ['fog', 'clear'],
    moods: ['reflective', 'calm'],
    timeOfDay: ['dawn', 'day'],
    isPexels: false,
  },
];

/**
 * Complete collection of Haven Artworks combining dynamic Pexels photography
 * and verified classical masterpieces.
 */
export const ALL_HAVEN_ARTWORKS: HavenArtwork[] = [
  ...PEXELS_HAVEN_ARTWORKS,
  ...CLASSICAL_HAVEN_ARTWORKS,
];

export function getPexelsArtworks(): HavenArtwork[] {
  return [...PEXELS_HAVEN_ARTWORKS];
}

export function getAllHavenArtworks(): HavenArtwork[] {
  return [...ALL_HAVEN_ARTWORKS];
}
