import fs from 'fs';
import path from 'path';

import { isAddress, Overrides, Provider } from 'ethers';
import { ERC20__factory } from '../typechain-types';

const WARP_SYMBOL = 'WARP';
const WARP_DECIMALS = 6;

export interface EthConnectionConfig {
  ethOptions?: Overrides;
  chainId: number;
}

export interface TokenConfig {
  address: string;
  symbol?: string;
  decimals?: number;
}

export interface DeploymentConfig {
  token: TokenConfig;
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

  await assertTokenConfig(config.token, provider);

  if (!isAddress(config.transferManager)) {
    throw new Error(`TransferManager value is not address: ${config.transferManager}`);
  }
}

async function assertTokenConfig(token: TokenConfig, provider: Provider): Promise<void> {
  if (!isAddress(token.address)) {
    throw new Error(`Invalid token address! Address: "${token.address}", symbol: ${token.symbol}`);
  }

  const tokenContract = ERC20__factory.connect(token.address, provider);

  const tokenSymbol = token.symbol ? token.symbol : WARP_SYMBOL;
  const symbol = await tokenContract.symbol();
  if (symbol !== tokenSymbol) {
    throw new Error(
      `Invalid token symbol! Address: ${token.address}, expected symbol: ${tokenSymbol}, actual: ${symbol}`
    );
  }

  const tokenDecimals = token.decimals ? token.decimals : WARP_DECIMALS;
  const decimals = await tokenContract.decimals();
  if (Number(decimals) !== tokenDecimals) {
    throw new Error(
      `Invalid token decimals! Address: ${token.address}, expected decimals: ${tokenDecimals}, actual: ${decimals}`
    );
  }
}
