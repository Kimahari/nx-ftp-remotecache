import { Task } from '@nrwl/workspace/src/tasks-runner/tasks-runner';
import defaultTaskRunner from '@nrwl/workspace/tasks-runners/default';
import { exec } from 'child_process';
import { join } from 'path';
import { Repository } from './classes/repository';
import { RunnerContext } from './interfaces/runner-context';
import { RunnerOptions } from './interfaces/runner-options';
import { performance } from 'perf_hooks';
import { output } from '@nrwl/workspace'

async function getGitBranch(): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
        exec('git rev-parse --abbrev-ref HEAD', (err: any, stdout: string, _: string) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(stdout.trim());
        });
    })
}

export default async function runner(tasks: Task[], options: RunnerOptions, context?: RunnerContext) {
    const projectName = options.projectName;
    const repository = new Repository(options.host, options.port, options.user, options.password);

    repository.toggleVerbose(options.verbose)

    let start = 0;
    
    // Cache git branch name once at initialization instead of on every operation
    const branch = await getGitBranch();

    return defaultTaskRunner(tasks, { ...options, remoteCache: { retrieve, store }, lifeCycle: { startTask, endTask } }, context);

    async function startTask(params: Task) {
        start = performance.now();
        console.info(`Task ${params.target.project}:${params.target.target} starting`,)
    }

    async function endTask(params: Task) {
        console.info(`Task ${params.target.project}:${params.target.target} completed in (${performance.now() - start}ms)`);
    }

    async function retrieve(hash: string, cacheDirectory: string): Promise<boolean> {
        try {
            await repository.Connect(projectName, branch);

            const hashFileName = `${hash}.commit`;

            output.logSingleLine(`Checking cache ${hash}.commit`)

            const cacheFileExists = await repository.containsFile(hashFileName);

            if (!cacheFileExists) return false;

            output.logSingleLine(`Downloading nx cache! ${hash}`);

            await repository.downloadDirectory(hash, join(cacheDirectory, hash));
            await repository.downloadFile(hashFileName, join(cacheDirectory, hashFileName));

            output.logSingleLine(`Downloaded nx cache! ${hash}`);
            return true;
        } catch (error: any) {
            output.error({
                title: `Error occurred whilst downloading nx cache! : ${error.message}`
            });
            return false;
        } finally {
            await repository.disconnect();
        }
    }

    async function store(hash: string, cacheDirectory: string): Promise<boolean> {
        try {
            output.logSingleLine('Uploading NX Cache...')

            await repository.Connect(projectName, branch);

            await repository.uploadDirectory(join(cacheDirectory, hash), cacheDirectory);
            await repository.uploadFile(join(cacheDirectory, `${hash}.commit`), cacheDirectory);

            output.logSingleLine(`Uploaded nx cache! ${hash}`);
            return true;
        } catch (error: any) {
            output.error({
                title: `Error occurred whilst uploading nx cache! : ${error.message}`
            });
            return false;
        } finally {
            await repository.disconnect();
        }
    }
}