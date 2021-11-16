import { readNxJson, ProjectGraphCache } from '@nrwl/workspace';
import { NxJsonConfiguration } from '@nrwl/tao/src/shared/nx';

export interface RunnerContext {
    target?: string;
    initiatingProject?: string | null;
    projectGraph: ProjectGraphCache;
    nxJson: NxJsonConfiguration;
}
