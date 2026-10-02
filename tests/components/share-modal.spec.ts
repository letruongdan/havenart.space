import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ShareModal from '../../src/components/ShareModal.svelte';

describe('ShareModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders quote card with title, body, and mood', () => {
    const { getByText } = render(ShareModal, {
      title: 'Khoảnh khắc bình yên',
      body: 'Gió thu xào xạc lá vàng rơi bên thềm.',
      mood: 'calm',
      lang: 'vi',
      onClose: vi.fn(),
    });

    expect(getByText('Khoảnh khắc bình yên')).toBeDefined();
    expect(getByText('Gió thu xào xạc lá vàng rơi bên thềm.')).toBeDefined();
    expect(getByText(/Không Gian Riêng Tư|Chia Sẻ Trang Ghi Chú/i)).toBeDefined();
  });

  it('copies artful quote to clipboard and shows feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    });

    const { getByRole, getByText } = render(ShareModal, {
      title: 'Tĩnh Lặng',
      body: 'Một ngày trôi qua thật êm đềm.',
      mood: 'peaceful',
      lang: 'vi',
      onClose: vi.fn(),
    });

    const copyBtn = getByRole('button', { name: /sao chép dạng trích dẫn|copy artful quote/i });
    await fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock.mock.calls[0][0]).toContain('Tĩnh Lặng');
    expect(writeTextMock.mock.calls[0][0]).toContain('Một ngày trôi qua thật êm đềm.');
    expect(writeTextMock.mock.calls[0][0]).toContain('Haven Art');

    expect(getByText(/đã sao chép/i)).toBeDefined();
  });

  it('calls onClose when close button is clicked', async () => {
    const onCloseMock = vi.fn();
    const { getByLabelText } = render(ShareModal, {
      title: 'Test Title',
      body: 'Test Body',
      onClose: onCloseMock,
    });

    const closeBtn = getByLabelText(/đóng/i);
    await fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
