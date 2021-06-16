import { dirname, basename } from 'path';
import { logDebug } from "./logDebug";
import { ftpChangeDirectory } from "./ftpChangeDirectory";
import { ftpStatus } from './ftp-status';

export async function ftpCreateDir(path: string) {
    if (!await ftpChangeDirectory(dirname(path))) {
        await ftpCreateDir(dirname(path));
    }

    logDebug('Creating remote location', path);

    return new Promise<boolean>(async (resolve, reject) => {
        ftpStatus.ftp.mkdir(basename(path), async (error) => {
            if (error) {
                logDebug('Error making remote directory', error);
                reject(error); return;
            }

            await ftpChangeDirectory(path);

            resolve(true);
        });
    });
}
