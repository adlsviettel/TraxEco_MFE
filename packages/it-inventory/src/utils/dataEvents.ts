/**
 * Simple event bus for cross-page data refresh.
 * Pages emit events after actions (import, push, delete, config_change),
 * and other pages listen to refresh their data when relevant.
 *
 * Much more efficient than polling — only refreshes when something actually changes.
 */

type EventCallback = () => void;

const listeners = new Map<string, Set<EventCallback>>();

export const DataEvents = {
  // Event types
  FILE_IMPORTED: 'file_imported',
  FILE_DELETED: 'file_deleted',
  PUSH_COMPLETED: 'push_completed',
  CONFIG_CHANGED: 'config_changed',
  DATA_CHANGED: 'data_changed', // generic catch-all

  emit(event: string) {
    console.log(`[DataEvent] ${event}`);
    listeners.get(event)?.forEach(cb => cb());
    // Also fire the generic event
    if (event !== 'data_changed') {
      listeners.get('data_changed')?.forEach(cb => cb());
    }
  },

  on(event: string, callback: EventCallback): () => void {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(callback);
    // Return unsubscribe function
    return () => listeners.get(event)?.delete(callback);
  },
};
