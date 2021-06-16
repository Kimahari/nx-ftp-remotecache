import { createWriteStream, existsSync, mkdirSync, promises } from 'fs';
import { ListingElement } from 'ftp';
import { basename, dirname, join, relative } from 'path';
import { ftpStatus } from './ftp-status';
import { ftpChangeDirectory } from './ftpChangeDirectory';
import { ftpCreateDir } from './ftpCreateDir';
import { logDebug } from './logDebug';
import { waitClientReady } from './waitClientReady';

export class Repository {
    private name: string = '';
    private branchName: string = '';

    constructor(private host: string, private port: number, private user: string, private password: string) {

    }

    public toggleVerbose(enabled = false) {
        ftpStatus.verboseEnabled = enabled;
    }

    public async Connect(name: string, bname: string) {
        logDebug(`Connecting repository ${name}`);
        this.name = name;
        this.branchName = bname;

        await waitClientReady(this.host, this.port, this.user, this.password);

        const repoLocation = join(name, this.branchName);

        if (!await ftpChangeDirectory(repoLocation)) await ftpCreateDir(repoLocation);

        logDebug(`Connected repository /${name}/${bname}`);

        return true;
    }

    public async diconnect() {
        ftpStatus.ftp.off('ready', ftpStatus.ftpListerner);
        if (ftpStatus.connected) ftpStatus.ftp.destroy()
        ftpStatus.connected = false;
    }

    async containsFile(fileName: string) {
        const repoDestination = join(this.name, this.branchName, fileName);

        logDebug(`Checking Contains file ${repoDestination}`);

        if (!await ftpChangeDirectory(dirname(repoDestination))) return false;

        return await new Promise<boolean>((resolve) => {
            ftpStatus.ftp.get(basename(fileName), (error) => {
                if (error) { resolve(false); return; }
                resolve(true);
            });
        })
    }

    async uploadFile(fileName: string, cacheDirectory: string) {
        const destination = relative(cacheDirectory, fileName);
        const repoDestination = join(this.name, this.branchName, destination);

        if (!await ftpChangeDirectory(dirname(repoDestination))) {
            await ftpCreateDir(dirname(repoDestination));
        }

        return new Promise((resolve, reject) => {
            try {
                logDebug(`Uploading ${destination} to ${basename(repoDestination)}....`);

                ftpStatus.ftp.put(fileName, basename(repoDestination), false, (err) => {

                    if (!err) {
                        logDebug(`Uploaded ${destination}....`);
                        resolve('');
                    }
                    else {
                        logDebug(`Failed to Upload ${destination}....`, err);
                        reject(err);
                    }
                });
            } catch (error) {
                console.error(`Failed to Upload ${destination}....`, error);
                reject(error);
            }
        })
    }

    async downloadFile(path: string, destination: string) {
        const destDir = dirname(destination);

        const base = `/${join(this.name, this.branchName)}`;
        const repoDestination = `${join(base, path).replace(/\\/g, '/')}`;

        if (!await ftpChangeDirectory(dirname(repoDestination))) return;

        if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

        await new Promise((resolve, reject) => {
            const fileName = basename(path);
            logDebug(`downloading ${fileName} to ${destination}....`);
            ftpStatus.ftp.get(fileName, (error, stream) => {
                if (error) { resolve(false); return; }
                stream.once('close', function () {
                    logDebug(`downloaded ${path}`);
                    resolve(true);
                });
                stream.pipe(createWriteStream(destination));
            });
        });
    }

    async downloadDirectory(path: string, destination: string) {
        const base = `/${join(this.name, this.branchName)}`;

        const repoDestination = `${join(base, path).replace(/\\/g, '/')}`;

        logDebug(`downloading directory ${repoDestination}`);

        logDebug('CacheDirectory', destination)

        return await new Promise<boolean>((resolve, reject) => {
            ftpStatus.ftp.list(repoDestination, async (error, listing) => {
                if (error) {
                    reject(error);
                    return;
                }

                const folders: ListingElement[] = [];

                for (const item of listing) {
                    if (item.type === 'l') continue;

                    if (item.type === 'd') {
                        folders.push(item);
                        continue;
                    }

                    const cacheDestination = join(destination, item.name);
                    logDebug('FILENAME', item.name);
                    await this.downloadFile(join(path, item.name), cacheDestination);
                }

                for (const item of folders) {
                    await this.downloadDirectory(join(path, item.name), join(destination, item.name));
                }

                resolve(true);
            });
        });
    }

    async uploadDirectory(pathToUpload: string, cacheDirectory: string) {
        for (const entry of await promises.readdir(pathToUpload)) {
            const full = join(pathToUpload, entry);
            const stats = await promises.stat(full);

            if (stats.isDirectory()) {
                await this.uploadDirectory(full, cacheDirectory);
            } else if (stats.isFile()) {
                await this.uploadFile(full, cacheDirectory);
            }
        }
    }



}