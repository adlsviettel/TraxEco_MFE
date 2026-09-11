/**
 * Hook that refreshes page data when:
 * 1. User navigates back to the page (route change)
 * 2. A DataEvent is emitted by another page (e.g. file imported, push completed)
 *
 * @param pagePath   The route path for this page
 * @param onVisible  Called to refresh data
 * @param events     Optional: DataEvent types to listen for (default: ['data_changed'])
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { DataEvents } from '../utils/dataEvents.ts';

function normalizePath(p: string): string {
  const stripped = p.replace(/^\/it-inventory/, '');
  return stripped === '' ? '/' : stripped;
}

export function usePageVisible(pagePath: string, onVisible: () => void, events?: string[]) {
  const location = useLocation();
  const isFirst = useRef(true);
  const callbackRef = useRef(onVisible);
  callbackRef.current = onVisible;

  // Trigger on route change
  useEffect(() => {
    const isActive = normalizePath(location.pathname) === normalizePath(pagePath);

    if (isActive) {
      if (isFirst.current) {
        isFirst.current = false;
      } else {
        callbackRef.current();
      }
    }
  }, [location.pathname, pagePath]);

  // Listen for data events (only refresh if page is currently active)
  useEffect(() => {
    const eventTypes = events || [
      DataEvents.DATA_CHANGED,
      DataEvents.FILE_DELETED,
      DataEvents.FILE_IMPORTED,
      DataEvents.PUSH_COMPLETED,
    ];
    const unsubscribes = eventTypes.map(event =>
      DataEvents.on(event, () => {
        if (normalizePath(location.pathname) === normalizePath(pagePath)) {
          callbackRef.current();
        }
      })
    );

    return () => unsubscribes.forEach(unsub => unsub());
  }, [location.pathname, pagePath, events]);
}
