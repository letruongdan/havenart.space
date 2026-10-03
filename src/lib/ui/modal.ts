// Svelte action: handles the topmost dialog, including nested dialogs.
const dialogs: HTMLElement[] = [];
export function modal(node: HTMLElement) {
  const previous = document.activeElement as HTMLElement | null;
  dialogs.push(node);
  const tabbable = () => Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')).filter(el => !el.closest('[inert]') && el.getClientRects().length);
  const restoreInert: Array<[HTMLElement, boolean]> = [];
  let branch: HTMLElement = node;
  while (branch.parentElement) {
    for (const sibling of Array.from(branch.parentElement.children)) {
      if (sibling !== branch && sibling instanceof HTMLElement) {
        restoreInert.push([sibling, sibling.inert]); sibling.inert = true;
      }
    }
    branch = branch.parentElement;
    if (branch === document.body) break;
  }
  node.tabIndex = -1;
  queueMicrotask(() => (tabbable()[0] || node).focus());
  const keepFocus = () => {
    if (dialogs.at(-1) === node && !node.contains(document.activeElement)) (tabbable()[0] || node).focus();
  };
  const observer = new MutationObserver(keepFocus);
  observer.observe(node, {childList:true,subtree:true});
  document.addEventListener('focusin',keepFocus);
  const keydown = (event: KeyboardEvent) => {
    if (dialogs.at(-1) !== node) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation();
      node.querySelector<HTMLButtonElement>('[data-modal-close]')?.click();
    } else if (event.key === 'Tab') {
      const items = tabbable();
      const first = items[0] || node, last = items.at(-1) || node;
      if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', keydown, true);
  return { destroy() {
    document.removeEventListener('keydown', keydown, true);
    document.removeEventListener('focusin',keepFocus);
    observer.disconnect();
    dialogs.splice(dialogs.indexOf(node), 1);
    for (const [el, inert] of restoreInert) el.inert = inert;
    if (previous?.isConnected && !previous.closest('[inert]')) previous.focus();
  } };
}
