import { Signer } from 'ethers';
import { HardhatRuntimeEnvironment, EthereumProvider } from 'hardhat/types';
import { WarpStake__factory, WarpStake } from '../typechain-types';
import { DeploymentConfig } from './config';
import { getImplementationAddress } from '@openzeppelin/upgrades-core';
import { removeForkManifest } from './fork';
import { SimpleLogger } from './logger';
import { DeploymentFile } from './deployment-store';
import { DeployState, StateFile } from './state-store';

export async function performDeployment(
  signer: Signer,
  config: DeploymentConfig,
  dryRun: boolean,
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const network = (await hre.ethers.provider.getNetwork()).name;
  const logger = new SimpleLogger((x) => console.error(x));

  const stateStore = new StateFile('WarpStake', network, !dryRun, logger).createStateStore();
  const deploymentStore = new DeploymentFile('WarpStake', network, !dryRun, logger).createDeploymentStore();

  const warpStake = await deployWarpStake(signer, hre, config);
  const warpStakeAddress = warpStake.target.toString();
  const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(warpStakeAddress);

  const deploymentData = { proxy: warpStakeAddress, implementation: implementationAddress };
  console.log(`Deployment: ${deploymentStore.stringify(deploymentData)}`);

  if (dryRun) {
    removeForkManifest();
  }

  stateStore.setById('WarpStake-proxy', <DeployState>{
    txHash: warpStake.deploymentTransaction()?.hash,
    address: warpStakeAddress,
  });
  stateStore.setById('WarpStake-impl', <DeployState>{ address: implementationAddress });
  deploymentStore.setById('WarpStake', deploymentData);
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
