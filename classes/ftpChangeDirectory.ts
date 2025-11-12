import { ftpStatus } from './ftp-status';
import { logDebug } from "./logDebug";

export async function ftpChangeDirectory(path: string) {
    path = `/${path.replace(/\\/g, '/')}`.replace('//', '/');

    // Skip if already in the target directory
    if (ftpStatus.currentDirectory === path) {
        logDebug(`Already in CWD : ${path}, skipping....`);
        return true;
    }

    logDebug(`Switching CWD : ${path}....`);

    return new Promise<boolean>((resolve) => {
        ftpStatus.ftp.cwd(path, (error, _) => {
            if (error) { 
                resolve(false); 
                return; 
            }

            ftpStatus.currentDirectory = path;
            logDebug(`SWITCHED CWD : ${path}....`);
            resolve(true);
        });
    });
}
