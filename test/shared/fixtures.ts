import { expect } from 'chai';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers, upgrades } from 'hardhat';
import { MintableERC20, MintableERC20__factory, WarpStake, WarpStake__factory } from '../../typechain-types';
import { parseUnits } from 'ethers';

export async function deployToken(owner: SignerWithAddress): Promise<MintableERC20> {
  return new MintableERC20__factory().connect(owner).deploy('warp token', 'WARP');
}

export async function deployWarpStakeContract(owner: SignerWithAddress, tokenAddress: string, transferManager: string): Promise<WarpStake> {
  return upgrades.deployProxy(new WarpStake__factory().connect(owner), [tokenAddress, transferManager], {
    initializer: 'initialize',
  }) as unknown as Promise<WarpStake>;
}

export async function deployWarpStake(): Promise<{
  owner: SignerWithAddress;
  transferManager: SignerWithAddress;
  warpStake: WarpStake;
  warpToken: MintableERC20;
}> {
  const users = (await ethers.getSigners()).slice(0, 5);
  const owner = users[0];
  const transferManager = (await ethers.getSigners()).at(-1)!;

  const warpToken = await deployToken(owner);
  const amount = parseUnits('1000000', await warpToken.decimals());
  await Promise.all(users.map((user) => warpToken.connect(owner).mint(user.address, amount)));

  const warpStake = await deployWarpStakeContract(owner, await warpToken.getAddress(), transferManager.address);

  expect(await warpStake.depositsActive()).to.be.true;
  expect(await warpStake.getToken()).to.be.eq(warpToken.target);

  return {
    owner,
    transferManager,
    warpStake,
    warpToken,
  };
}
