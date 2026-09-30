import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Gate from '../../src/components/Gate.svelte';

describe('Gate Component', () => {
  it('triggers enter event upon Enter or Space key press', async () => {
    let entered = false;
    const { getByRole } = render(Gate, { onEnter: () => { entered = true; } });
    const button = getByRole('button', { name: /bước vào/i });

    await fireEvent.keyDown(button, { key: 'Enter' });
    expect(entered).toBe(true);
  });

  it('triggers enter event upon Space key press', async () => {
    let entered = false;
    const { getByRole } = render(Gate, { onEnter: () => { entered = true; } });
    const button = getByRole('button', { name: /bước vào/i });

    await fireEvent.keyDown(button, { key: ' ' });
    expect(entered).toBe(true);
  });

  it('triggers enter event upon click', async () => {
    let entered = false;
    const { getByRole } = render(Gate, { onEnter: () => { entered = true; } });
    const button = getByRole('button', { name: /bước vào/i });

    await fireEvent.click(button);
    expect(entered).toBe(true);
  });

  it('does not trigger enter on unrelated keys', async () => {
    let entered = false;
    const { getByRole } = render(Gate, { onEnter: () => { entered = true; } });
    const button = getByRole('button', { name: /bước vào/i });

    await fireEvent.keyDown(button, { key: 'Tab' });
    await fireEvent.keyDown(button, { key: 'Escape' });
    expect(entered).toBe(false);
  });

  it('renders serene welcoming typography and accessible button', () => {
    const { getByRole, getByText } = render(Gate, { onEnter: () => {} });
    expect(getByText(/Haven Art/i)).toBeDefined();
    const button = getByRole('button', { name: /bước vào/i });
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-label') || button.textContent).toMatch(/bước vào/i);
  });
});
