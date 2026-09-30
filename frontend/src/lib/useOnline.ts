/**
 * Network status (ADR-0012, BR §0): no offline mutations. While offline the UI shows the banner and disables every
 * mutating button. `navigator.onLine` is the browser's own signal; a request that still fails maps to NETWORK_ERROR.
 */
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

const getSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
