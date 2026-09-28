/**
 * HavenArt — Navigation Context & Locale Handoff
 * Contract Version: havenart-contracts-1.1
 * References: docs/I18N_SPEC.md, docs/agents/CONTRACTS.md (C08)
 *
 * Local Criteria (W24):
 * - W24-AC1: Giữ chapter/local progress, #contact và mode; restore trước reveal canvas.
 * - W24-AC2: Snapshot stale/wrong schema/unknown chapter bỏ an toàn; no PII; storage unavailable vẫn navigation dùng được.
 * - W24-AC3: Đóng modal để đổi locale hủy scroll restore cũ; không bật audio ở route mới; hard navigation/back-forward covered.
 */

import type { Locale, ChapterId, ExperienceMode } from '@/types/story';
import type { LocaleHandoffPayload } from '@/types/runtime';

export const LOCALE_HANDOFF_KEY = 'havenart:locale-handoff:v1';
export const LOCALE_HANDOFF_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

export const ALLOWED_CHAPTER_IDS: readonly ChapterId[] = [
  'exterior',
  'approach',
  'entrance',
  'living',
  'garden',
  'finale',
] as const;

export const ALLOWED_MODES: readonly ExperienceMode[] = [
  'poster',
  'loading',
  'cinematic',
  'static',
] as const;

/**
 * Validates whether a target anchor is safe and allowlisted (prevents arbitrary URL injection).
 */
export function isAllowedAnchor(anchor: string | null): boolean {
  if (anchor === null) return true;
  if (!anchor.startsWith('#')) return false;

  const tag = anchor.slice(1);
  if (tag === 'contact') return true;
  if (ALLOWED_CHAPTER_IDS.includes(tag as ChapterId)) return true;
  if (tag.startsWith('detail-')) return true;

  return false;
}

/**
 * Saves locale handoff state to sessionStorage.
 * Gracefully handles browser storage restrictions, disabled storage, or quota exceptions.
 */
export function saveLocaleHandoff(
  input: {
    readonly fromLocale: Locale;
    readonly toLocale: Locale;
    readonly chapterId: ChapterId;
    readonly localProgress: number;
    readonly mode: ExperienceMode;
    readonly targetAnchor?: string | null;
  },
  storage?: Storage
): boolean {
  try {
    const targetStorage =
      storage ??
      (typeof window !== 'undefined'
        ? window.sessionStorage
        : typeof sessionStorage !== 'undefined'
          ? sessionStorage
          : null);

    if (!targetStorage) {
      return false;
    }

    const safeAnchor = isAllowedAnchor(input.targetAnchor ?? null)
      ? (input.targetAnchor ?? null)
      : null;

    const payload: LocaleHandoffPayload = {
      schemaVersion: 1,
      fromLocale: input.fromLocale,
      toLocale: input.toLocale,
      chapterId: input.chapterId,
      localProgress: Math.max(0, Math.min(1, input.localProgress)),
      mode: input.mode,
      targetAnchor: safeAnchor,
      createdAtMs: Date.now(),
    };

    targetStorage.setItem(LOCALE_HANDOFF_KEY, JSON.stringify(payload));
    return true;
  } catch {
    // Storage unavailable or disabled in private browsing: fail safely without breaking
    return false;
  }
}

/**
 * Consumes single-use locale handoff payload from sessionStorage.
 * Validates schema version, TTL, chapter ID, mode, and target locale.
 * Automatically clears storage item to ensure single-use semantics.
 */
export function consumeLocaleHandoff(
  expectedTargetLocale: Locale,
  storage?: Storage,
  nowMs: number = Date.now()
): LocaleHandoffPayload | null {
  try {
    const targetStorage =
      storage ??
      (typeof window !== 'undefined'
        ? window.sessionStorage
        : typeof sessionStorage !== 'undefined'
          ? sessionStorage
          : null);

    if (!targetStorage) {
      return null;
    }

    const raw = targetStorage.getItem(LOCALE_HANDOFF_KEY);
    if (!raw) {
      return null;
    }

    // Immediately remove item to enforce consume-once semantics
    targetStorage.removeItem(LOCALE_HANDOFF_KEY);

    const parsed = JSON.parse(raw);

    // Schema validation
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.schemaVersion !== 1) return null;
    if (parsed.toLocale !== expectedTargetLocale) return null;
    if (!ALLOWED_CHAPTER_IDS.includes(parsed.chapterId)) return null;
    if (!ALLOWED_MODES.includes(parsed.mode)) return null;

    // TTL check (must be within 5 minutes)
    if (typeof parsed.createdAtMs !== 'number') return null;
    if (nowMs - parsed.createdAtMs > LOCALE_HANDOFF_TTL_MS || nowMs < parsed.createdAtMs) {
      return null;
    }

    // Anchor allowlist check
    const targetAnchor = isAllowedAnchor(parsed.targetAnchor)
      ? parsed.targetAnchor
      : null;

    return {
      schemaVersion: 1,
      fromLocale: parsed.fromLocale,
      toLocale: parsed.toLocale,
      chapterId: parsed.chapterId,
      localProgress: Math.max(
        0,
        Math.min(1, typeof parsed.localProgress === 'number' ? parsed.localProgress : 0)
      ),
      mode: parsed.mode,
      targetAnchor,
      createdAtMs: parsed.createdAtMs,
    };
  } catch {
    // Corrupted JSON or storage failure: discard safely
    return null;
  }
}

export interface HavenArtHistoryState {
  readonly chapterId: ChapterId;
  readonly localProgress: number;
  readonly mode: ExperienceMode;
  readonly targetAnchor?: string | null;
}

/**
 * Saves current experience snapshot into browser History under the 'havenart' namespace.
 * Preserves existing router state keys.
 */
export function saveHistoryState(
  state: HavenArtHistoryState,
  historyObj?: History
): void {
  try {
    const hist = historyObj ?? (typeof window !== 'undefined' ? window.history : null);
    if (!hist) return;

    const existingState = hist.state && typeof hist.state === 'object' ? hist.state : {};
    hist.replaceState(
      {
        ...existingState,
        havenart: {
          chapterId: state.chapterId,
          localProgress: Math.max(0, Math.min(1, state.localProgress)),
          mode: state.mode,
          targetAnchor: state.targetAnchor ?? null,
        },
      },
      ''
    );
  } catch {
    // Fail safely if history is restricted
  }
}

/**
 * Retrieves the persisted HavenArt state from browser History.
 */
export function getHistoryState(
  historyObj?: History
): HavenArtHistoryState | null {
  try {
    const hist = historyObj ?? (typeof window !== 'undefined' ? window.history : null);
    if (!hist || !hist.state || typeof hist.state !== 'object') return null;

    const data = hist.state.havenart;
    if (!data || typeof data !== 'object') return null;
    if (!ALLOWED_CHAPTER_IDS.includes(data.chapterId)) return null;
    if (!ALLOWED_MODES.includes(data.mode)) return null;

    return {
      chapterId: data.chapterId,
      localProgress: typeof data.localProgress === 'number' ? data.localProgress : 0,
      mode: data.mode,
      targetAnchor: data.targetAnchor ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Builds the destination URL for locale switching.
 * Standard HTML link format for 100% no-JS resilience.
 */
export function getLocaleSwitchUrl(
  targetLocale: Locale,
  activeChapterId?: ChapterId,
  targetAnchor?: string | null
): string {
  const anchor =
    targetAnchor && isAllowedAnchor(targetAnchor)
      ? targetAnchor
      : activeChapterId
        ? `#${activeChapterId}`
        : '';

  return `/${targetLocale}${anchor}`;
}
