import { Logger } from './logger';
import fs from 'fs';
import path from 'path';

export interface DeploymentStore {
  getById: (id: string) => DeploymentState | undefined;
  setById: (id: string, deploymentState: DeploymentState) => void;
  stringify: (argDeployment?: DeploymentState) => string;
}

export interface DeploymentState {
  proxy: string;
  implementation: string;
}

export interface BaseDeployment {
  [id: string]: DeploymentState;
}

export function createDefaultBaseDeployment(): BaseDeployment {
  return {};
}

export class DeploymentFile<TDeployment extends BaseDeployment> {
  private readonly deploymentName: string;
  private readonly createDefaultDeployment: () => TDeployment;
  private readonly fileName: string;
  private readonly writeToFile: boolean;
  private readonly logger: Logger;

  constructor(
    name: string,
    network: string,
    writeToFile: boolean,
    logger: Logger,
    createDefaultDeployment?: () => TDeployment
  ) {
    this.deploymentName = name;
    this.fileName = this.getDeploymentFilePath(network);
    this.writeToFile = writeToFile;
    this.logger = logger;
    this.createDefaultDeployment = createDefaultDeployment ? createDefaultDeployment : this.createDefaultBaseDeployment;
  }

  public getDeploymentFromFile(): TDeployment {
    if (fs.existsSync(this.fileName)) {
      return JSON.parse(fs.readFileSync(this.fileName, 'utf-8'));
    } else {
      this.logger.log(`${this.deploymentName} deployment file not found, a new one will created`);
    }

    return this.createDefaultDeployment();
  }

  public saveDeploymentFileChanges(deployment: TDeployment) {
    const s = JSON.stringify(deployment, null, 2);
    fs.writeFileSync(this.fileName, s, { encoding: 'utf8' });
  }

  public createDeploymentStore(): DeploymentStore {
    const deployment = this.getDeploymentFromFile();
    return {
      getById: (id: string): DeploymentState | undefined => {
        return deployment[id];
      },
      setById: (id: string, deploymentState: DeploymentState) => {
        deployment[id] = deploymentState;

        if (this.writeToFile) {
          this.saveDeploymentFileChanges(deployment);
        }
      },
      stringify: (argDeployment?: DeploymentState): string => {
        return JSON.stringify(argDeployment ? argDeployment : deployment, null, 2);
      },
    };
  }

  private createDefaultBaseDeployment(): BaseDeployment {
    return {};
  }

  private getDeploymentFilePath(network: string): string {
    const dirName = path.join(__dirname, `data`, `contracts`);
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName);
    }

    if (!fs.statSync(dirName).isDirectory()) {
      throw new Error(`Not a directory: ${dirName}`);
    }

    return path.join(__dirname, `data`, `contracts`, `${network}.json`);
  }
}
