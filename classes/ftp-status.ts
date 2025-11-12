import Client from 'ftp';

export const ftpStatus = {
    ftpListerner: () => { },
    connected: false,
    ftp: new Client(),
    verboseEnabled: false,
    currentDirectory: ''
}