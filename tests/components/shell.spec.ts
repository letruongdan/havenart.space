import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import HavenShell from '../../src/components/HavenShell.svelte';

describe('HavenShell Experience State Machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts at gate state and renders Gate component', () => {
    const { getByRole, queryByRole } = render(HavenShell);
    const enterBtn = getByRole('button', { name: /bước vào/i });
    expect(enterBtn).toBeDefined();

    // Dock is not yet visible at gate state
    const dockNav = queryByRole('navigation', { name: /bảng điều khiển haven art/i });
    expect(dockNav).toBeNull();
  });

  it('transitions from gate to haven when user enters', async () => {
    const { getByRole, queryByRole } = render(HavenShell);
    const enterBtn = getByRole('button', { name: /bước vào/i });

    await fireEvent.click(enterBtn);

    // After entering, dock should be mounted
    await waitFor(() => {
      const dockNav = queryByRole('navigation', { name: /bảng điều khiển haven art/i });
      expect(dockNav).not.toBeNull();
    });
  });

  it('opens and closes journal panels from dock actions', async () => {
    const { getByRole, queryByRole, getByText } = render(HavenShell);
    const enterBtn = getByRole('button', { name: /bước vào/i });

    await fireEvent.click(enterBtn);

    const writeBtn = await waitFor(() => getByRole('button', { name: /viết nhật ký/i }));
    await fireEvent.click(writeBtn);

    // Modal opens
    expect(getByRole('dialog')).toBeDefined();
    expect(getByRole('heading', { name: /nhật ký/i })).toBeDefined();

    // Close button works
    const closeBtn = getByRole('button', { name: /đóng/i });
    await fireEvent.click(closeBtn);
    expect(queryByRole('dialog')).toBeNull();
  });

  it('mounts WritePanel and JournalList inside respective containers', async () => {
    const { getByRole, getByPlaceholderText, queryByPlaceholderText } = render(HavenShell);
    const enterBtn = getByRole('button', { name: /bước vào/i });
    await fireEvent.click(enterBtn);

    // Open Write modal
    const writeBtn = await waitFor(() => getByRole('button', { name: /viết nhật ký/i }));
    await fireEvent.click(writeBtn);

    // WritePanel is mounted with its textarea
    expect(document.querySelector('#journal-write-container')).not.toBeNull();
    expect(getByPlaceholderText(/viết những suy nghĩ của bạn/i)).toBeDefined();

    // Close write modal
    const closeBtn = getByRole('button', { name: /đóng/i });
    await fireEvent.click(closeBtn);

    // Open List modal
    const listBtn = getByRole('button', { name: /danh sách bài viết/i });
    await fireEvent.click(listBtn);

    // JournalList is mounted with its search input
    expect(document.querySelector('#journal-list-container')).not.toBeNull();
    expect(getByPlaceholderText(/tìm kiếm bài viết/i)).toBeDefined();
  });
});
