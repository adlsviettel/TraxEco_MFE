export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

/**
 * Smoothly scrolls to the top of a table container, main content, or window.
 * Useful for pagination transitions and page navigation.
 */
export function scrollToTop(targetRef?: { current: HTMLElement | null } | HTMLElement | null): void {
  try {
    if (targetRef) {
      const el = 'current' in targetRef ? targetRef.current : targetRef;
      if (el) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  } catch {
    // ignore
  }

  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {
    // ignore
  }

  try {
    const main = document.querySelector('main');
    if (main) {
      main.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch {
    // ignore
  }
}

