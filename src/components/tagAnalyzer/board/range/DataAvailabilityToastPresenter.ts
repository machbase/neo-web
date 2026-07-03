import { Toast } from '@/design-system/components';
import type { DataAvailabilityIssue } from '../../fetch/panelData/PanelDataFetchTypes';
import { getDataAvailabilityToastMessage } from '../../fetch/panelData/DataTimeRangeFetcher';

type DataAvailabilityToastPresentation = {
    hasMessage: boolean;
    didShow: boolean;
};

const sShownAvailabilityIssueKeys = new Set<string>();

export function showDataAvailabilityToastOnce(
    issues: DataAvailabilityIssue[],
): DataAvailabilityToastPresentation {
    const sMessage = getDataAvailabilityToastMessage(issues);
    if (!sMessage) {
        return {
            hasMessage: false,
            didShow: false,
        };
    }

    const sNewIssues = issues.filter(
        (issue) => !sShownAvailabilityIssueKeys.has(getDataAvailabilityIssueKey(issue)),
    );
    const sNewIssueMessage = getDataAvailabilityToastMessage(sNewIssues);

    if (!sNewIssueMessage) {
        return {
            hasMessage: true,
            didShow: false,
        };
    }

    sNewIssues.forEach((issue) => {
        sShownAvailabilityIssueKeys.add(getDataAvailabilityIssueKey(issue));
    });
    Toast.error(sNewIssueMessage);

    return {
        hasMessage: true,
        didShow: true,
    };
}

function getDataAvailabilityIssueKey(issue: DataAvailabilityIssue): string {
    switch (issue.kind) {
        case 'missing-table':
            return `${issue.kind}:${issue.table}`;
        case 'missing-tag':
        case 'no-data':
            return `${issue.kind}:${issue.table}:${issue.tagName ?? ''}`;
        case 'request-failed':
            return `${issue.kind}:${issue.message}`;
    }
}
