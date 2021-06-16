import { DefaultTasksRunnerOptions } from '@nrwl/workspace/src/tasks-runner/default-tasks-runner';

export interface RunnerOptions extends DefaultTasksRunnerOptions {
    projectName: string;
    host: string;
    port: number;
    user: string;
    password: string
    verbose?: boolean
}
