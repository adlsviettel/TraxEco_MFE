export interface OfflineRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
  metadata: {
    description: string;
    app: string;
  };
}

const STORAGE_KEY = 'trax_offline_queue';

export const offlineSyncService = {
  getQueue(): OfflineRequest[] {
    try {
      const qs = localStorage.getItem(STORAGE_KEY);
      return qs ? JSON.parse(qs) : [];
    } catch {
      return [];
    }
  },

  enqueue(url: string, method: string, headers: Record<string, string>, body: any, metadata: { description: string, app: string }) {
    const queue = this.getQueue();
    const newReq: OfflineRequest = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
      url,
      method,
      headers,
      body,
      timestamp: Date.now(),
      metadata,
    };
    queue.push(newReq);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    
    // Dispatch event to notify UI
    window.dispatchEvent(new CustomEvent('offline_queue_updated'));
  },

  dequeue(id: string) {
    let queue = this.getQueue();
    queue = queue.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('offline_queue_updated'));
  },

  clearQueue() {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('offline_queue_updated'));
  },

  async syncAll(): Promise<{ successCount: number; failCount: number }> {
    if (!navigator.onLine) {
      throw new Error('No internet connection. Cannot sync.');
    }

    const queue = this.getQueue();
    if (queue.length === 0) return { successCount: 0, failCount: 0 };

    let successCount = 0;
    let failCount = 0;
    const remainingQueue: OfflineRequest[] = [];

    for (const req of queue) {
      try {
        const res = await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify(req.body),
        });

        if (res.ok) {
          successCount++;
        } else {
          // If it fails with 4xx or 5xx, we keep it in the queue for later manual resolution,
          // or we could discard. For now, keep it if it's a 5xx server error, drop if 4xx client error?
          // To be safe, we'll keep everything that fails so data isn't lost.
          console.error('Sync failed for request:', req.id, 'Status:', res.status);
          failCount++;
          remainingQueue.push(req);
        }
      } catch (err) {
        console.error('Network failure during sync for request:', req.id, err);
        failCount++;
        remainingQueue.push(req);
      }
    }

    if (remainingQueue.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingQueue));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('offline_queue_updated'));

    return { successCount, failCount };
  }
};
