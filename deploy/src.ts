import { Signer, Wallet } from 'ethers';
import { HardhatRuntimeEnvironment, EthereumProvider, HardhatNetworkUserConfig, HttpNetworkUserConfig } from 'hardhat/types';
import fs from 'fs';
import path from 'path';
import { WarpStake__factory, WarpStake } from '../typechain-types';
import { DeploymentConfig } from './config';
import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider';
import ganache from 'ganache';
import { getImplementationAddress } from '@openzeppelin/upgrades-core';

export async function performDeployment(
  signer: Signer,
  config: DeploymentConfig,
  network: string,
  dryRun: boolean,
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const actualDeploymentFile = path.join(__dirname, `data`, `contracts`, `${network}.json`);

  const warpStake = await deployWarpStake(signer, hre, config);
  const warpStakeAddress = warpStake.target.toString();
  const implementationAddress = await getImplementationAddress(
    signer.provider as unknown as EthereumProvider,
    warpStakeAddress
  );

  if (!dryRun) {
    fs.writeFileSync(
      actualDeploymentFile,
      JSON.stringify({ contract: warpStakeAddress, implementation: implementationAddress }),
      { flag: 'wx' }
    );
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

export async function constructSigner(
  hre: HardhatRuntimeEnvironment,
  privateKey: string,
  dryRun: boolean
): Promise<Wallet> {
  console.log(`\Creating signer`);
  let provider = hre.ethers.provider;

  if (dryRun) {
    console.log(`Dry run: running on fork`);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const networkConfig = hre.config.networks[network.name] as HttpNetworkUserConfig;

    if (networkConfig.url === undefined) {
      throw new Error('Can\'t create a fork for dry run');
    }

    const options = {
      chain: { chainId: chainId },
      logging: { quiet: true },
      fork: { url: networkConfig.url },
    };
    const ganacheProvider = await ganache.provider(options);
    await ganacheProvider.once('connect');
    provider = new HardhatEthersProvider(ganacheProvider as unknown as EthereumProvider, 'fork');
  }

  console.log(`Current block number: ${await provider.getBlockNumber()}`);
  return new hre.ethers.Wallet(privateKey, provider);
}
