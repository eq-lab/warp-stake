import { HardhatRuntimeEnvironment, EthereumProvider, HttpNetworkUserConfig } from 'hardhat/types';
import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider';
import ganache from 'ganache';
import fs from 'fs';
import path from 'path';

const GANACHE_CHAIN_ID = 1337;
// https://github.com/OpenZeppelin/openzeppelin-upgrades/blob/6a9aef6a72a82c140599605555d1cff304e608bc/packages/core/src/manifest.ts#L51
const MANIFEST_DEFAULT_DIR = process.env.MANIFEST_DEFAULT_DIR || '.openzeppelin';
// https://github.com/OpenZeppelin/openzeppelin-upgrades/blob/6a9aef6a72a82c140599605555d1cff304e608bc/packages/core/src/manifest.ts#L129
const MANIFEST_DEFAULT_NAME = `unknown-${GANACHE_CHAIN_ID}`;

export async function fork(hre: HardhatRuntimeEnvironment): Promise<void> {
  console.log(`Dry run: running on fork`);
  const network = await hre.ethers.provider.getNetwork();
  const networkConfig = hre.config.networks[network.name] as HttpNetworkUserConfig;

  if (networkConfig.url === undefined) {
    throw new Error("Can't create a fork for dry run");
  }

  const options = {
    chain: { chainId: GANACHE_CHAIN_ID },
    logging: { quiet: true },
    fork: { url: networkConfig.url },
  };
  const ganacheProvider = await ganache.provider(options);
  await ganacheProvider.once('connect');

  const newEthereumProvider = ganacheProvider as unknown as EthereumProvider;

  hre.ethers.provider = new HardhatEthersProvider(newEthereumProvider, `${network.name}`);
  hre.network.provider = newEthereumProvider;
}

export function removeForkManifest() {
  const manifest = path.join(MANIFEST_DEFAULT_DIR, `${MANIFEST_DEFAULT_NAME}.json`);
  if (!fs.existsSync(manifest)) {
    console.warn(`Manifest with path ${manifest} doesn't exist`);
    return;
  }

  fs.rmSync(manifest);
}
