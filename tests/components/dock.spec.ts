import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Dock from '../../src/components/Dock.svelte';

describe('Dock Component', () => {
  it('renders playback controls and toggles playback on click', async () => {
    let playToggled = false;
    const { getByRole } = render(Dock, {
      isPlaying: false,
      onTogglePlay: () => {
        playToggled = true;
      },
    });

    const playBtn = getByRole('button', { name: /phát nhạc|tạm dừng/i });
    expect(playBtn).toBeDefined();
    await fireEvent.click(playBtn);
    expect(playToggled).toBe(true);
  });

  it('triggers volume change callback on volume slider change', async () => {
    let changedVolume = -1;
    const { getByRole } = render(Dock, {
      volume: 0.4,
      onVolumeChange: (val: number) => {
        changedVolume = val;
      },
    });

    const slider = getByRole('slider', { name: /âm lượng/i });
    expect(slider).toBeDefined();
    await fireEvent.input(slider, { target: { value: '0.8' } });
    expect(changedVolume).toBe(0.8);
  });

  it('toggles mute when clicking the speaker icon button', async () => {
    let changedVolume = -1;
    const { getByRole } = render(Dock, {
      volume: 0.6,
      onVolumeChange: (val: number) => {
        changedVolume = val;
      },
    });

    const muteBtn = getByRole('button', { name: /tắt tiếng|bật tiếng|mute/i });
    expect(muteBtn).toBeDefined();
    await fireEvent.click(muteBtn);
    expect(changedVolume).toBe(0);
  });

  it('restores volume when clicking speaker icon when muted', async () => {
    let changedVolume = -1;
    const { getByRole } = render(Dock, {
      volume: 0,
      onVolumeChange: (val: number) => {
        changedVolume = val;
      },
    });

    const unmuteBtn = getByRole('button', { name: /tắt tiếng|bật tiếng|unmute/i });
    expect(unmuteBtn).toBeDefined();
    await fireEvent.click(unmuteBtn);
    expect(changedVolume).toBeGreaterThan(0);
  });

  it('toggles visual mode between shader and static', async () => {
    let modeToggled = false;
    const { getByRole } = render(Dock, {
      visualMode: 'shader',
      onToggleVisualMode: () => {
        modeToggled = true;
      },
    });

    const visualBtn = getByRole('button', { name: /chế độ hình nền|ảnh tĩnh|shader/i });
    expect(visualBtn).toBeDefined();
    await fireEvent.click(visualBtn);
    expect(modeToggled).toBe(true);
  });

  it('displays artwork title when provided', () => {
    const { getByText } = render(Dock, {
      artworkTitle: 'Buổi sáng yên bình',
    });
    expect(getByText(/Buổi sáng yên bình/i)).toBeDefined();
  });

  it('renders action buttons for journal write and list', async () => {
    let writeClicked = false;
    let listClicked = false;
    const { getByRole } = render(Dock, {
      onOpenJournalWrite: () => {
        writeClicked = true;
      },
      onOpenJournalList: () => {
        listClicked = true;
      },
    });

    const writeBtn = getByRole('button', { name: /viết nhật ký/i });
    const listBtn = getByRole('button', { name: /danh sách bài viết/i });

    expect(writeBtn).toBeDefined();
    expect(listBtn).toBeDefined();

    await fireEvent.click(writeBtn);
    expect(writeClicked).toBe(true);

    await fireEvent.click(listBtn);
    expect(listClicked).toBe(true);
  });
});
