import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import snapshotGasCost from '@uniswap/snapshot-gas-cost';
import { deployWarpStake } from '../shared/fixtures';
import { parseUnits } from 'ethers';
import { ethers } from 'hardhat';

describe('WarpStake gas', () => {
  it('deposit', async () => {
    const { warpToken, warpStake } = await loadFixture(deployWarpStake);
    const [_, user] = await ethers.getSigners();

    const input = parseUnits('1', await warpToken.decimals());
    await warpToken.connect(user).approve(warpStake.target, input);

    await snapshotGasCost(Number(await warpStake.connect(user).deposit.estimateGas(input)));
  });

  it('withdraw', async () => {
    const { transferManager, warpToken, warpStake } = await loadFixture(deployWarpStake);
    const [_, user] = await ethers.getSigners();

    const input = parseUnits('1', await warpToken.decimals());
    await warpToken.connect(user).approve(warpStake.target, input);
    await warpStake.connect(user).deposit(input);

    await warpStake.connect(transferManager).toggleWithdraws();

    await snapshotGasCost(Number(await warpStake.connect(user).withdraw.estimateGas()));
  });
});
