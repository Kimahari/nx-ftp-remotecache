import { ftpStatus } from './ftp-status';

import { output } from '@nrwl/workspace'

export function logDebug(message?: any, ...optionalParams: any[]) {
    if (!ftpStatus.verboseEnabled) return;
    output.logSingleLine(message)
    if (optionalParams && optionalParams.length > 0) {
        output.logSingleLine(JSON.stringify(optionalParams))
    }
}
