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

    public async disconnect() {
        ftpStatus.ftp.off('ready', ftpStatus.ftpListerner);
        if (ftpStatus.connected) ftpStatus.ftp.destroy()
        ftpStatus.connected = false;
        ftpStatus.currentDirectory = '';
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
                const files: ListingElement[] = [];

                for (const item of listing) {
                    if (item.type === 'l') continue;

                    if (item.type === 'd') {
                        folders.push(item);
                    } else {
                        files.push(item);
                    }
                }

                // Download all files in parallel
                await Promise.all(files.map(async (item) => {
                    const cacheDestination = join(destination, item.name);
                    logDebug('FILENAME', item.name);
                    await this.downloadFile(join(path, item.name), cacheDestination);
                }));

                // Download subdirectories in parallel
                await Promise.all(folders.map(async (item) => {
                    await this.downloadDirectory(join(path, item.name), join(destination, item.name));
                }));

                resolve(true);
            });
        });
    }

    async uploadDirectory(pathToUpload: string, cacheDirectory: string) {
        const entries = await promises.readdir(pathToUpload);
        
        // Collect all files and directories
        const operations = await Promise.all(entries.map(async (entry) => {
            const full = join(pathToUpload, entry);
            const stats = await promises.stat(full);
            return { full, stats };
        }));

        // Separate files and directories
        const files = operations.filter(op => op.stats.isFile());
        const directories = operations.filter(op => op.stats.isDirectory());

        // Upload all files in parallel
        await Promise.all(files.map(op => this.uploadFile(op.full, cacheDirectory)));

        // Upload all directories in parallel
        await Promise.all(directories.map(op => this.uploadDirectory(op.full, cacheDirectory)));
    }



}