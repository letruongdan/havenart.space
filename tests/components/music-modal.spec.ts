import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MusicLibraryModal from '../../src/components/MusicLibraryModal.svelte';
import { ALL_HAVEN_AUDIO_TRACKS } from '../../src/lib/audio/ambient-catalog';

describe('MusicLibraryModal Component', () => {
  it('renders all tracks and summary counters for Piano and Ambient', () => {
    const { getByRole, getByText } = render(MusicLibraryModal, {
      currentTrackId: 'haven-piano-kiss-the-rain',
      isPlaying: true,
      onSelectTrack: vi.fn(),
      onClose: vi.fn(),
    });

    const dialog = getByRole('dialog');
    expect(dialog).toBeDefined();

    // Verify category pill counters
    expect(getByText(/Tất cả \(27\)/i)).toBeDefined();
    expect(getByText(/Piano \(17\)/i)).toBeDefined();
    expect(getByText(/Ambient \(10\)/i)).toBeDefined();
  });

  it('filters tracks when clicking category pills', async () => {
    const { getByText, queryByText } = render(MusicLibraryModal, {
      onSelectTrack: vi.fn(),
      onClose: vi.fn(),
    });

    // Click Piano filter
    const pianoBtn = getByText(/Piano \(17\)/i);
    await fireEvent.click(pianoBtn);

    // Moonlight Sonata (piano) should be present
    expect(getByText(/Moonlight Sonata/i)).toBeDefined();

    // Morning Mist (ambient) should not be present
    expect(queryByText(/Morning Mist/i)).toBeNull();

    // Click Ambient filter
    const ambientBtn = getByText(/Ambient \(10\)/i);
    await fireEvent.click(ambientBtn);

    // Morning Mist should now be present
    expect(getByText(/Morning Mist/i)).toBeDefined();
    // Moonlight Sonata should be absent
    expect(queryByText(/Moonlight Sonata/i)).toBeNull();
  });

  it('filters tracks by search query', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(MusicLibraryModal, {
      onSelectTrack: vi.fn(),
      onClose: vi.fn(),
    });

    const searchInput = getByPlaceholderText(/tìm theo tên bài hát/i);
    await fireEvent.input(searchInput, { target: { value: 'Beethoven' } });

    expect(getByText(/Moonlight Sonata/i)).toBeDefined();
    expect(queryByText(/Kiss the Rain/i)).toBeNull();
  });

  it('invokes onSelectTrack when clicking a track in the list', async () => {
    let selectedTrack: any = null;
    const { getByText } = render(MusicLibraryModal, {
      onSelectTrack: (track: any) => {
        selectedTrack = track;
      },
      onClose: vi.fn(),
    });

    const trackItem = getByText(/Kiss the Rain/i);
    await fireEvent.click(trackItem);

    expect(selectedTrack).not.toBeNull();
    expect(selectedTrack.id).toBe('haven-piano-kiss-the-rain');
  });

  it('calls onClose when clicking close button or pressing Escape', async () => {
    let closed = false;
    const { getByRole } = render(MusicLibraryModal, {
      onSelectTrack: vi.fn(),
      onClose: () => {
        closed = true;
      },
    });

    const closeBtn = getByRole('button', { name: /đóng thư viện âm nhạc/i });
    await fireEvent.click(closeBtn);
    expect(closed).toBe(true);

    closed = false;
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(closed).toBe(true);
  });
});
