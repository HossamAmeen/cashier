/**
 * Offline banner (BR §9 UI-only message, OQ-42, ADR-0012). Shown whenever the browser reports no network; mutating
 * buttons point at it (aria-describedby) as their disabled reason. Nothing is queued offline (BR §0).
 */
import { NETWORK_ERROR_MESSAGE } from '@/lib/errors';
import { useOnline } from '@/lib/useOnline';

import { Icon } from './Icon';
import { OFFLINE_BANNER_ID } from './ui/Button';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      id={OFFLINE_BANNER_ID}
      role="alert"
      data-testid="offline-banner"
      className="flex items-center gap-2 bg-danger px-4 py-2.5 text-body font-semibold text-white"
    >
      <Icon name="wifiOff" size={18} />
      <span>{NETWORK_ERROR_MESSAGE}</span>
    </div>
  );
}
