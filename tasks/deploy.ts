import { task } from 'hardhat/config';
import { HardhatNetworkConfig, HardhatRuntimeEnvironment } from 'hardhat/types';
import { loadDeployConfig } from '../deploy/config';
import { constructSigner, performDeployment } from '../deploy/src';

interface DeployArgs {
  networkName: string;
  creatorPrivateKey: string;
  dryRun: boolean;
}

task('task:deploy', 'Deploy Yield proxies and implementations')
  .addParam<string>('networkName', 'Network name')
  .addParam<string>('creatorPrivateKey', 'Private key of contracts creator')
  .addFlag('dryRun')
  .setAction(async (taskArgs: DeployArgs, hre: HardhatRuntimeEnvironment) => {
    const network = taskArgs.networkName.toLowerCase();

    const networkConfig = hre.config.networks[network] as HardhatNetworkConfig | undefined;
    if (networkConfig === undefined) {
      throw new Error(`Failed to find config for a network with a name ${network}`);
    }

    const dryRun = taskArgs.dryRun;

    if (!dryRun && hre.network.name.toLowerCase() !== network) {
      throw new Error(`The network from the config and from CLI "--network" must be same!`);
    }

    if (dryRun) {
      console.log(`Dry run command on fork`);
      const blockNumber = await hre.ethers.provider.getBlockNumber();
      console.log(`Fork block number: ${blockNumber}`);
    }

    const signer = await constructSigner(hre, taskArgs.creatorPrivateKey, dryRun);

    const balanceBefore = await signer.provider!.getBalance(signer.address);
    console.log(`Balance before: ${hre.ethers.formatEther(balanceBefore)} Eth`);
    const config = await loadDeployConfig(network, signer.provider!, dryRun);

    await performDeployment(signer, config, network, dryRun, hre);

    const balanceAfter = await signer.provider!.getBalance(signer.address);
    console.log(`Balance after: ${hre.ethers.formatEther(balanceAfter)} Eth`);

    console.log(`Spent: ${hre.ethers.formatEther(balanceBefore - balanceAfter)} Eth`);
    console.log(`Done!`);
  });
