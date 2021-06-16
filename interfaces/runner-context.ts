import { NxJson, ProjectGraph } from '@nrwl/workspace';

export interface RunnerContext {
    target?: string;
    initiatingProject?: string | null;
    projectGraph: ProjectGraph;
    nxJson: NxJson;
}
