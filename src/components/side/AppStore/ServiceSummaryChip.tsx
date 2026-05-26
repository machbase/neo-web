// Renders aggregated child-service health for `managed=false` packages
// (replication, opcua-client, etc.) as a small ratio chip with an optional
// warning + tooltip when the controller reports per-service errors.
//
// The `serviceSummary` payload originates from `cgi-bin/api/health` and is
// parsed defensively in `steps/pkgHealth.ts`. When absent (legacy controllers
// or `managed=true` packages), the chip renders nothing — callers in
// `item.tsx` / `info.tsx` decide whether to show it based on the manifest's
// `packageService.managed` flag.
//
// Notes:
// - `VscCircleFilled` is intentionally imported from `react-icons/vsc` rather
//   than `@/assets/icons/Icon` because the barrel does not re-export it.
// - Tooltip id is derived from `pkgName` so multiple chips on the same page
//   (catalog + detail view) do not collide.

import { VscCircleFilled } from 'react-icons/vsc';
import { VscWarning } from '@/assets/icons/Icon';
import { Tooltip } from 'react-tooltip';
import type { PkgServiceSummary } from './pkgLifecycle/steps/pkgHealth';

type Props = {
    summary?: PkgServiceSummary;
    pkgName: string;
};

export const ServiceSummaryChip = ({ summary, pkgName }: Props) => {
    if (!summary) return null;
    const { total, running, errors } = summary;
    const dotColor = running > 0 ? '#3fb950' : '#6e7681';
    const tooltipId = `pkg-svc-errs-${pkgName}`;
    const hasErrors = errors.length > 0;
    return (
        <span className="app-store-service-chip">
            <VscCircleFilled size={10} style={{ color: dotColor, flexShrink: 0 }} />
            <span>
                {running}/{total}
            </span>
            {hasErrors && (
                <>
                    <VscWarning data-tooltip-id={tooltipId} style={{ color: '#FDB532', flexShrink: 0, cursor: 'help' }} />
                    <Tooltip id={tooltipId} content={errors.join('\n')} style={{ whiteSpace: 'pre-line' }} />
                </>
            )}
        </span>
    );
};
