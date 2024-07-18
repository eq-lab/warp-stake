import fs from 'fs';
import path from 'path';

import { isAddress, Overrides, Provider } from 'ethers';

export interface EthConnectionConfig {
  ethOptions?: Overrides;
  chainId: number;
}

export interface DeploymentConfig {
  token: string;
  transferManager: string;
  ethConnection: EthConnectionConfig;
}

export async function loadDeployConfig(
  network: string,
  provider: Provider,
  dryRun: boolean
): Promise<DeploymentConfig> {
  const configDir = path.join(__dirname, `data`, `configs`, network);

  if (!fs.existsSync(configDir)) {
    throw new Error(`Directory '${configDir}' does not exists`);
  }
  if (!fs.statSync(configDir).isDirectory()) {
    throw new Error(`Specified '${configDir}' is not a directory`);
  }
  const configFilename = path.join(configDir, 'config.json');
  if (!fs.existsSync(configFilename)) {
    throw new Error(`Deploy config is not exist! Filename: ${configFilename}`);
  }
  const config: DeploymentConfig = JSON.parse(fs.readFileSync(configFilename, 'utf-8'));

  await assertDeployConfigValidity(config, provider, dryRun);

  return config;
}

async function assertDeployConfigValidity(
  config: DeploymentConfig,
  provider: Provider,
  dryRun: boolean
): Promise<void> {
  const assertChainId = config.ethConnection.chainId;
  const network = await provider.getNetwork();

  if (!dryRun && Number(network.chainId) !== assertChainId) {
    throw new Error(`Chain id is invalid! Expected: ${assertChainId}, actual: ${network.chainId}`);
  }

  if (config.ethConnection.ethOptions === undefined) {
    console.warn('ethOptions are undefined: this may cause unexpected deployment fails');
  }

  if (!isAddress(config.token)) {
    throw new Error(`Token value is not address: ${config.token}`);
  }

  if (!isAddress(config.transferManager)) {
    throw new Error(`TransferManager value is not address: ${config.transferManager}`);
  }
}
