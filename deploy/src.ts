import { Signer, Wallet } from 'ethers';
import { HardhatRuntimeEnvironment, EthereumProvider, HttpNetworkUserConfig } from 'hardhat/types';
import fs from 'fs';
import path from 'path';
import { WarpStake__factory, WarpStake } from '../typechain-types';
import { DeploymentConfig } from './config';
import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider';
import ganache from 'ganache';
import { getImplementationAddress } from '@openzeppelin/upgrades-core';

interface DeploymentData {
  proxy: string;
  implementation: string;
}

export async function performDeployment(
  signer: Signer,
  config: DeploymentConfig,
  dryRun: boolean,
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const warpStake = await deployWarpStake(signer, hre, config);
  const warpStakeAddress = warpStake.target.toString();
  const implementationAddress = await getImplementationAddress(
    signer.provider as unknown as EthereumProvider,
    warpStakeAddress
  );

  const deploymentData = { proxy: warpStakeAddress, implementation: implementationAddress };

  if (!dryRun) {
    saveState(deploymentData, hre.network.name.toLowerCase(), warpStake.deploymentTransaction()?.hash);
    saveDeployment(deploymentData, hre.network.name.toLowerCase());
  }
}

async function deployWarpStake(
  signer: Signer,
  hre: HardhatRuntimeEnvironment,
  config: DeploymentConfig
): Promise<WarpStake> {
  console.log('Deploying WarpStake contract');

  const warpStake = (await hre.upgrades.deployProxy(
    await new WarpStake__factory().connect(signer),
    [config.token, config.transferManager],
    {
      initializer: 'initialize',
      txOverrides: config.ethConnection.ethOptions,
    }
  )) as unknown as WarpStake;

  return warpStake.waitForDeployment();
}

function saveDeployment(deploymentData: DeploymentData, network: string) {
  const actualDeploymentFile = path.join(__dirname, `data`, `contracts`, `${network}.json`);
  fs.writeFileSync(actualDeploymentFile, JSON.stringify(deploymentData, null, 2), { flag: 'wx' });
}

function saveState(deploymentData: DeploymentData, network: string, txHash: string | undefined) {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const stateFilename = path.join(
    __dirname,
    `data`,
    `configs`,
    `${network}`,
    `/deployment-${year}-${month}-${day}.json`
  );

  const state = { proxy: deploymentData.proxy, implementation: deploymentData.implementation, tx: txHash };

  const data = JSON.stringify(state, null, 2) + `\n`;
  const resolvedPath = path.resolve(__dirname, stateFilename);
  fs.writeFileSync(resolvedPath, data, { flag: 'wx' });
  console.log(`\nDeployment data saved: ${resolvedPath}`);
}

export async function constructSigner(
  hre: HardhatRuntimeEnvironment,
  privateKey: string,
  dryRun: boolean
): Promise<Wallet> {
  console.log(`Creating signer`);
  const provider = dryRun ? await createFork(hre) : hre.ethers.provider;
  console.log(`Current block number: ${await provider.getBlockNumber()}`);
  return new hre.ethers.Wallet(privateKey, provider);
}

async function createFork(hre: HardhatRuntimeEnvironment): Promise<HardhatEthersProvider> {
  console.log(`Dry run: running on fork`);
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const networkConfig = hre.config.networks[network.name] as HttpNetworkUserConfig;

  if (networkConfig.url === undefined) {
    throw new Error("Can't create a fork for dry run");
  }

  const options = {
    chain: { chainId: chainId },
    logging: { quiet: true },
    fork: { url: networkConfig.url },
  };
  const ganacheProvider = await ganache.provider(options);
  await ganacheProvider.once('connect');
  hre.network.provider = ganacheProvider as unknown as EthereumProvider;
  return new HardhatEthersProvider(ganacheProvider as unknown as EthereumProvider, `${network.name}`);
}
