import Client from 'ftp';
import { ftpStatus } from './ftp-status';
import { logDebug } from './logDebug';

export async function waitClientReady(host: string, port: number, user: string, password: string) {
    return new Promise<Client>(async (resolve) => {
        if (ftpStatus.connected)
            resolve(ftpStatus.ftp);

        ftpStatus.ftpListerner = () => {
            ftpStatus.connected = true;
            logDebug(`Connected to ftp ${user}@${host}:${port}....`);
            resolve(ftpStatus.ftp);
        };

        ftpStatus.ftp.on('ready', ftpStatus.ftpListerner);

        logDebug(`Connecting to ftp ${user}@${host}:${port}....`);

        ftpStatus.ftp.connect({ host, port, user, password });
    });
}
