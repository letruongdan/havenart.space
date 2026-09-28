/**
 * HavenArt — Interactive Hotspots Configuration
 * Contract Version: havenart-contracts-1.1
 */

import type { Hotspot, HotspotId } from '@/types/story';

export const HOTSPOT_IDS: readonly HotspotId[] = [
  'travertine-wall',
  'sliding-glass',
  'garden-tree',
] as const;

export const HOTSPOTS: readonly Hotspot[] = [
  {
    id: 'travertine-wall',
    room: 'living',
    category: 'material',
    copyKey: 'hotspots.travertine-wall',
    activationRange: [0.15, 0.6],
    position: [-2.5, 1.4, 9.2],
    maxDistanceM: 6.0,
  },
  {
    id: 'sliding-glass',
    room: 'living',
    category: 'architecture',
    copyKey: 'hotspots.sliding-glass',
    activationRange: [0.42, 0.92],
    position: [2.2, 1.5, 14.8],
    maxDistanceM: 7.0,
  },
  {
    id: 'garden-tree',
    room: 'garden',
    category: 'landscape',
    copyKey: 'hotspots.garden-tree',
    activationRange: [0.2, 0.75],
    position: [1.5, 2.0, 24.5],
    maxDistanceM: 9.0,
  },
] as const;
