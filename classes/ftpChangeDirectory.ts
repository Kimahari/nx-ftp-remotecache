import { ftpStatus } from './ftp-status';
import { logDebug } from "./logDebug";

export async function ftpChangeDirectory(path: string) {
    path = `/${path.replace(/\\/g, '/')}`.replace('//', '/');

    logDebug(`Switching CWD : ${path}....`);

    return new Promise<boolean>((resolve) => {
        ftpStatus.ftp.cwd(path, (error, _) => {
            if (error) { resolve(false); return; }

            logDebug(`SWITCHED CWD : ${path}....`);
            resolve(true);
        });
    });
}
