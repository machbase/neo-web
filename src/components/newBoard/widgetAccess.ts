import { useEffect, useState } from 'react';
import { fetchQuery } from '@/api/repository/database';
import { accountKey } from './layout/newTabStorage';
import { STATZ_TABLE } from './serverMetrics';
import { WidgetNode } from './layout/layoutModel';

/**
 * Whether the signed-in account can read the server's own metrics (`_NEO_STATZ`, a SYS table). An
 * account without access gets an error for every query on it, so the widgets built on it (Server
 * pulse, and the examples that read it) are left off its New tab instead of showing an error.
 */
export type StatzAccess = 'checking' | 'yes' | 'no';

// One check per account per page. A failed request (not a refusal) is forgotten, so the next mount asks again.
const sChecks = new Map<string, Promise<boolean>>();
const checkStatz = (aAccount: string) => {
    let sCheck = sChecks.get(aAccount);
    if (!sCheck) {
        sCheck = fetchQuery(`SELECT NAME FROM ${STATZ_TABLE} LIMIT 1`)
            .then((aResult) => aResult.svrState)
            .catch(() => {
                sChecks.delete(aAccount);
                return false;
            });
        sChecks.set(aAccount, sCheck);
    }
    return sCheck;
};

export const useStatzAccess = (): StatzAccess => {
    const sAccount = accountKey();
    const [sState, setState] = useState<{ account: string; access: StatzAccess }>({ account: sAccount, access: 'checking' });

    useEffect(() => {
        let sAlive = true;
        checkStatz(sAccount).then((aOk) => sAlive && setState({ account: sAccount, access: aOk ? 'yes' : 'no' }));
        return () => {
            sAlive = false;
        };
    }, [sAccount]);

    return sState.account === sAccount ? sState.access : 'checking';
};

/** Widgets this account cannot use. While the check runs they count as unavailable, so they never flash in and out. */
export const isWidgetAvailable = (aWidget: Pick<WidgetNode, 'type'>, aStatz: StatzAccess) => aWidget.type !== 'pulse' || aStatz === 'yes';

/** Why a widget is unavailable, for the panel and the edit view. */
export const UNAVAILABLE_REASON = 'Needs access to the server metrics (_NEO_STATZ, a SYS table)';
