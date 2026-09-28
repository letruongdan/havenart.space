/**
 * HavenArt — Garden Detail & Finale Component Unit Tests
 * Test Suite: tests/unit/garden-layout.test.ts
 * Contract Version: havenart-contracts-1.1
 *
 * Local Criteria (W19):
 * - W19-AC1: Terrace doorway clearance; final rise outside roof looking back at home.
 * - W19-AC2: garden-tree anchor preserved at [1.5, 2.0, 24.5]; trees don't obstruct rail.
 * - W19-AC3: Finale CTA targets #contact strictly without creating duplicate section#contact.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import { createGardenZoneObject } from '@/components/scene/zones/Garden';
import { Finale } from '@/components/story/Finale';
import { ZONE_MANIFESTS } from '@/config/zones';
import { CAMERA_OPTICS, CAMERA_WAYPOINTS } from '@/config/camera';
import { HOTSPOTS } from '@/config/hotspots';
import { sampleRail } from '@/lib/three/cameraRail';
import type { ChapterCopy } from '@/types/story';

describe('W19 — Garden Zone Layout & Finale Presentation', () => {
  const gardenManifest = ZONE_MANIFESTS.find((z) => z.id === 'garden')!;

  it('W19-AC1: Garden zone detail fits strictly within spatial manifest boundaries', () => {
    expect(gardenManifest).toBeDefined();

    const gardenObj = createGardenZoneObject('high');
    const bbox = new THREE.Box3().setFromObject(gardenObj);

    // Tolerance of 0.05m
    expect(bbox.min.x).toBeGreaterThanOrEqual(gardenManifest.bounds.min[0] - 0.05);
    expect(bbox.min.y).toBeGreaterThanOrEqual(gardenManifest.bounds.min[1] - 0.05);
    expect(bbox.min.z).toBeGreaterThanOrEqual(gardenManifest.bounds.min[2] - 0.05);
    expect(bbox.max.x).toBeLessThanOrEqual(gardenManifest.bounds.max[0] + 0.05);
    expect(bbox.max.y).toBeLessThanOrEqual(gardenManifest.bounds.max[1] + 0.05);
    expect(bbox.max.z).toBeLessThanOrEqual(gardenManifest.bounds.max[2] + 0.05);
  });

  it('W19-AC1: Camera rail through garden & elevated finale rise is unobstructed (clearance >= 0.38m)', () => {
    const gardenObj = createGardenZoneObject('high');

    // Collect all mesh bounding boxes
    const meshBoxes: THREE.Box3[] = [];
    gardenObj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshBoxes.push(new THREE.Box3().setFromObject(child));
      }
    });

    expect(meshBoxes.length).toBeGreaterThan(10);

    // Sample camera rail across garden and finale range (p = 0.68 to 1.0)
    const samplesCount = 50;
    for (let i = 0; i <= samplesCount; i++) {
      const p = 0.68 + (1.0 - 0.68) * (i / samplesCount);
      const pose = sampleRail(p);
      const camPos = new THREE.Vector3(...pose.position);

      for (const box of meshBoxes) {
        const closestPoint = new THREE.Vector3();
        box.clampPoint(camPos, closestPoint);
        const distance = camPos.distanceTo(closestPoint);

        expect(
          distance,
          `Garden clearance violation at p=${p.toFixed(3)}, camPos=(${camPos.x.toFixed(2)}, ${camPos.y.toFixed(2)}, ${camPos.z.toFixed(2)}) against box (${box.min.toArray().map((n) => n.toFixed(2)).join(',')}) to (${box.max.toArray().map((n) => n.toFixed(2)).join(',')})`
        ).toBeGreaterThanOrEqual(CAMERA_OPTICS.minClearanceM);
      }
    }
  });

  it('W19-AC1: Finale elevated rise (p=1.0) is placed outside villa roof looking back at home', () => {
    const finalWaypoint = CAMERA_WAYPOINTS.find((w) => w.progress === 1.0)!;
    expect(finalWaypoint).toBeDefined();

    // At p=1.0: position [0, 6.0, 29.0], target [0, 2.0, 10.0]
    expect(finalWaypoint.position[1]).toBe(6.0); // Above villa roof (Y = 3.9)
    expect(finalWaypoint.position[2]).toBe(29.0); // Outside rear roof envelope (Z = 16.0)
    expect(finalWaypoint.target[2]).toBeLessThan(finalWaypoint.position[2]); // Looking backward towards house
  });

  it('W19-AC2: Hero garden-tree anchor is preserved at exact coordinates [1.5, 2.0, 24.5]', () => {
    const gardenObj = createGardenZoneObject('high');
    const treeConfig = HOTSPOTS.find((h) => h.id === 'garden-tree')!;

    expect(treeConfig).toBeDefined();

    let anchorFound = false;
    gardenObj.traverse((child) => {
      if (child.name === 'hotspot-anchor-garden-tree') {
        anchorFound = true;
        expect(child.position.x).toBeCloseTo(treeConfig.position[0], 2);
        expect(child.position.y).toBeCloseTo(treeConfig.position[1], 2);
        expect(child.position.z).toBeCloseTo(treeConfig.position[2], 2);
      }
    });

    expect(anchorFound).toBe(true);
  });

  it('W19-AC3: Finale component links strictly to #contact without creating duplicate section#contact', () => {
    const sampleCopy: ChapterCopy = {
      title: 'Ngôi nhà nên kể câu chuyện của chính bạn',
      story: 'Không gian sống hoàn thiện khi nó phản ánh trung thực lối sống của chủ nhân.',
      intention: 'Khép lại trải nghiệm',
      principles: ['Tối giản', 'Gần gũi thiên nhiên'],
      materials: 'Gỗ teak, đá tự nhiên',
      light: 'Ánh sáng hoàng hôn',
      imageAlt: 'Phối cảnh toàn cảnh ngôi nhà trong ánh hoàng hôn',
    };

    const html = renderToStaticMarkup(
      React.createElement(Finale, {
        copy: sampleCopy,
        contactCtaLabel: 'Liên hệ kiến trúc sư',
      })
    );

    // 1. Must link to #contact
    expect(html).toContain('href="#contact"');
    expect(html).toContain('Liên hệ kiến trúc sư');

    // 2. MUST NOT create a duplicate id="contact" or section#contact
    expect(html).not.toContain('id="contact"');
    expect(html).not.toContain('<section');

    // 3. Must not contain fake contact info
    expect(html).not.toContain('tel:');
    expect(html).not.toContain('example.com');
  });

  it('W19-AC1 & W19-AC2: Quality tier controls shadow casting correctly', () => {
    const high = createGardenZoneObject('high');
    const low = createGardenZoneObject('low');

    let highShadows = 0;
    high.traverse((c) => {
      if ((c as THREE.Mesh).castShadow) highShadows++;
    });

    let lowShadows = 0;
    low.traverse((c) => {
      if ((c as THREE.Mesh).castShadow) lowShadows++;
    });

    expect(highShadows).toBeGreaterThan(lowShadows);
    expect(lowShadows).toBe(0);
  });
});
