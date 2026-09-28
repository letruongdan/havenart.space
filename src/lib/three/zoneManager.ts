/**
 * HavenArt — Zone Manager & LRU Streaming Controller
 * Contract Version: havenart-contracts-1.1
 * References: docs/ASSET_PIPELINE.md, docs/SCENE_ARCHITECTURE.md
 */

import type {
  ZoneHandle,
  ZoneManager,
  ZoneManagerDeps,
  ZoneManifestEntry,
} from '@/types/scene';
import { sampleChapter } from '@/lib/story/sampleChapter';
import { CHAPTERS } from '@/config/story';

export function createZoneManager(deps: ZoneManagerDeps): ZoneManager {
  const zoneManifestMap = new Map<string, ZoneManifestEntry>();
  for (const zone of deps.zones) {
    zoneManifestMap.set(zone.id, zone);
  }

  // Determine chronological ordered list of unique zones across story chapters
  const orderedZoneSequence: string[] = [];
  for (const chapter of CHAPTERS) {
    const zoneId = deps.chapterZones[chapter.id];
    if (zoneId && !orderedZoneSequence.includes(zoneId)) {
      orderedZoneSequence.push(zoneId);
    }
  }

  // Resident state
  const residentHandles = new Map<string, ZoneHandle>();
  const inFlightControllers = new Map<string, AbortController>();
  const lastUsedTimestamps = new Map<string, number>();
  const failedCoreZones = new Set<string>();

  let currentTimestamp = 0;
  let isDisposed = false;

  function notifyResidentChangeIfDifferent(previousIds: Set<string>): void {
    const currentIds = new Set(residentHandles.keys());
    if (previousIds.size !== currentIds.size || Array.from(previousIds).some((id) => !currentIds.has(id))) {
      deps.onResidentChange(Array.from(residentHandles.values()));
    }
  }

  function evictZone(zoneId: string): void {
    const handle = residentHandles.get(zoneId);
    if (handle) {
      handle.release();
      residentHandles.delete(zoneId);
      lastUsedTimestamps.delete(zoneId);
    }

    const controller = inFlightControllers.get(zoneId);
    if (controller) {
      controller.abort();
      inFlightControllers.delete(zoneId);
    }
  }

  async function acquireZone(zoneId: string, isCore: boolean): Promise<void> {
    if (residentHandles.has(zoneId) || inFlightControllers.has(zoneId) || isDisposed) {
      return;
    }

    const manifest = zoneManifestMap.get(zoneId);
    if (!manifest) {
      if (isCore) {
        const err = new Error(`Core zone manifest entry not found for "${zoneId}"`);
        deps.onCoreFailure(err);
      }
      return;
    }

    const controller = new AbortController();
    inFlightControllers.set(zoneId, controller);

    try {
      const handle = await deps.loader.acquire(manifest, controller.signal);

      if (isDisposed || controller.signal.aborted) {
        handle.release();
        return;
      }

      inFlightControllers.delete(zoneId);
      residentHandles.set(zoneId, handle);
      currentTimestamp++;
      lastUsedTimestamps.set(zoneId, currentTimestamp);

      // Emit change
      deps.onResidentChange(Array.from(residentHandles.values()));
    } catch (err: unknown) {
      inFlightControllers.delete(zoneId);

      if (controller.signal.aborted || isDisposed) {
        return;
      }

      const error = err instanceof Error ? err : new Error(String(err));

      if (isCore) {
        failedCoreZones.add(zoneId);
        deps.onCoreFailure(error);
      }
    }
  }

  function update(p: number, direction: -1 | 0 | 1): void {
    if (isDisposed) return;

    currentTimestamp++;
    const previousResidentIds = new Set(residentHandles.keys());

    // 1. Identify active chapter and active zone
    const activeChapter = sampleChapter(CHAPTERS, p);
    const activeZoneId = deps.chapterZones[activeChapter.id];

    if (!activeZoneId) {
      return;
    }

    // Touch active zone timestamp
    lastUsedTimestamps.set(activeZoneId, currentTimestamp);

    // 2. Identify pinned zones: active zone + persistent shell (if present in manifest)
    const pinnedZoneIds = new Set<string>([activeZoneId]);
    if (zoneManifestMap.has('shell')) {
      pinnedZoneIds.add('shell');
      lastUsedTimestamps.set('shell', currentTimestamp);
    }

    // 3. Prioritize neighbor zones based on scroll direction (W09-AC1)
    const activeIndex = orderedZoneSequence.indexOf(activeZoneId);
    const nextZoneId = activeIndex >= 0 && activeIndex < orderedZoneSequence.length - 1
      ? orderedZoneSequence[activeIndex + 1]
      : null;
    const prevZoneId = activeIndex > 0
      ? orderedZoneSequence[activeIndex - 1]
      : null;

    const candidatePriority: string[] = [];

    // Directional prefetch prioritization
    if (direction === 1) {
      if (nextZoneId) candidatePriority.push(nextZoneId);
      if (prevZoneId) candidatePriority.push(prevZoneId);
    } else if (direction === -1) {
      if (prevZoneId) candidatePriority.push(prevZoneId);
      if (nextZoneId) candidatePriority.push(nextZoneId);
    } else {
      if (nextZoneId) candidatePriority.push(nextZoneId);
      if (prevZoneId) candidatePriority.push(prevZoneId);
    }

    // 4. Calculate desired detail zones within budget and maxDetailZones
    const desiredZones = new Set<string>(pinnedZoneIds);
    let currentDetailBytes = 0;
    let detailCount = 0;

    // Account for active zone bytes and count (shell is counted separately per C07)
    const activeManifest = zoneManifestMap.get(activeZoneId);
    if (activeManifest) {
      currentDetailBytes += activeManifest.encodedBytes;
      detailCount++;
    }

    // Add candidates in priority order within limits
    for (const candidateId of candidatePriority) {
      const manifest = zoneManifestMap.get(candidateId);
      if (!manifest) continue;

      const fitsCount = detailCount + 1 <= deps.maxDetailZones;
      const fitsBytes = currentDetailBytes + manifest.encodedBytes <= deps.budgetBytes;

      if (fitsCount && fitsBytes) {
        desiredZones.add(candidateId);
        currentDetailBytes += manifest.encodedBytes;
        detailCount++;
      }
    }

    // 5. Evict unpinned resident zones not in desiredZones using LRU
    const evictCandidates = Array.from(residentHandles.keys())
      .filter((id) => !pinnedZoneIds.has(id) && !desiredZones.has(id))
      .sort((a, b) => (lastUsedTimestamps.get(a) || 0) - (lastUsedTimestamps.get(b) || 0));

    for (const idToEvict of evictCandidates) {
      evictZone(idToEvict);
    }

    // Cancel in-flight acquire jobs that are no longer desired
    for (const [inFlightId, controller] of inFlightControllers.entries()) {
      if (!desiredZones.has(inFlightId)) {
        controller.abort();
        inFlightControllers.delete(inFlightId);
      }
    }

    // 6. Acquire missing desired zones
    for (const idToAcquire of desiredZones) {
      const isCore = pinnedZoneIds.has(idToAcquire);
      if (!residentHandles.has(idToAcquire) && !inFlightControllers.has(idToAcquire)) {
        if (!failedCoreZones.has(idToAcquire)) {
          void acquireZone(idToAcquire, isCore);
        }
      }
    }

    notifyResidentChangeIfDifferent(previousResidentIds);
  }

  function dispose(): void {
    if (isDisposed) return;
    isDisposed = true;

    // Abort in-flight
    for (const controller of inFlightControllers.values()) {
      controller.abort();
    }
    inFlightControllers.clear();

    // Release all resident handles
    for (const handle of residentHandles.values()) {
      handle.release();
    }
    residentHandles.clear();
    lastUsedTimestamps.clear();
    failedCoreZones.clear();
  }

  return {
    update,
    dispose,
  };
}
