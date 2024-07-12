import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { ethers, upgrades } from 'hardhat';
import { parseUnits } from 'ethers';
import { deployWarpStake } from './shared/fixtures';
import { WarpStakeUpgradeTest__factory } from '../typechain-types';

describe('WarpStake', () => {
  it('stake', async () => {
    const { warpStake, warpToken } = await loadFixture(deployWarpStake);

    const [_, user] = await ethers.getSigners();

    const userBalanceBefore = await warpToken.balanceOf(user.address);
    const contractBalanceBefore = await warpToken.balanceOf(warpStake.target);

    const amount = parseUnits('10', await warpToken.decimals());
    await warpToken.connect(user).approve(warpStake.target, amount);
    await warpStake.connect(user).deposit(amount);

    expect(await warpStake.getMaxIndex()).to.be.eq(1);
    expect(await warpStake.getUserIndex(user.address)).to.be.eq(1);
    expect(await warpStake.getUserByIndex(1)).to.be.eq(user.address);
    expect(await warpStake.getUserAmount(user.address)).to.be.eq(amount);
    expect(await warpStake.getTotalAmount()).to.be.eq(amount);
    expect(await warpToken.balanceOf(warpStake.target)).to.be.eq(contractBalanceBefore + amount);
    expect(await warpToken.balanceOf(user.address)).to.be.eq(userBalanceBefore - amount);
  });

  it('additional stake', async () => {
    const { warpStake, warpToken } = await loadFixture(deployWarpStake);

    const [_, user] = await ethers.getSigners();

    const userBalanceBefore = await warpToken.balanceOf(user.address);
    const contractBalanceBefore = await warpToken.balanceOf(warpStake.target);

    const amount = parseUnits('10', await warpToken.decimals());
    await warpToken.connect(user).approve(warpStake.target, amount);
    await warpStake.connect(user).deposit(amount);

    await warpToken.connect(user).approve(warpStake.target, amount);
    await warpStake.connect(user).deposit(amount);

    const delta = 2n * amount;

    expect(await warpStake.getMaxIndex()).to.be.eq(1);
    expect(await warpStake.getUserIndex(user.address)).to.be.eq(1);
    expect(await warpStake.getUserByIndex(1)).to.be.eq(user.address);
    expect(await warpStake.getUserAmount(user.address)).to.be.eq(delta);
    expect(await warpStake.getTotalAmount()).to.be.eq(delta);
    expect(await warpToken.balanceOf(warpStake.target)).to.be.eq(contractBalanceBefore + delta);
    expect(await warpToken.balanceOf(user.address)).to.be.eq(userBalanceBefore - delta);
  });

  it('two users stake', async () => {
    const { warpStake, warpToken } = await loadFixture(deployWarpStake);

    const [_, user1, user2] = await ethers.getSigners();

    const userBalanceBefore = await warpToken.balanceOf(user1.address);
    const contractBalanceBefore = await warpToken.balanceOf(warpStake.target);

    const user1amount = parseUnits('10', await warpToken.decimals());
    const user2amount = parseUnits('20', await warpToken.decimals());
    await warpToken.connect(user1).approve(warpStake.target, user1amount);
    await warpStake.connect(user1).deposit(user1amount);

    await warpToken.connect(user2).approve(warpStake.target, user2amount);
    await warpStake.connect(user2).deposit(user2amount);

    const delta = user1amount + user2amount;

    expect(await warpStake.getMaxIndex()).to.be.eq(2);

    expect(await warpStake.getUserIndex(user1.address)).to.be.eq(1);
    expect(await warpStake.getUserIndex(user2.address)).to.be.eq(2);

    expect(await warpStake.getUserByIndex(1)).to.be.eq(user1.address);
    expect(await warpStake.getUserByIndex(2)).to.be.eq(user2.address);

    expect(await warpStake.getUserAmount(user1.address)).to.be.eq(user1amount);
    expect(await warpStake.getUserAmount(user2.address)).to.be.eq(user2amount);

    expect(await warpStake.getTotalAmount()).to.be.eq(delta);
    expect(await warpToken.balanceOf(warpStake.target)).to.be.eq(contractBalanceBefore + delta);
    expect(await warpToken.balanceOf(user1.address)).to.be.eq(userBalanceBefore - user1amount);
    expect(await warpToken.balanceOf(user2.address)).to.be.eq(userBalanceBefore - user2amount);
  });

  it('stake zero amount', async () => {
    const { warpStake } = await loadFixture(deployWarpStake);

    const [_, user] = await ethers.getSigners();
    await expect(warpStake.connect(user).deposit(0)).to.be.revertedWith('Zero amount');
  });

  it('withdraws disabled by default', async () => {
    const { warpStake, warpToken } = await loadFixture(deployWarpStake);
    expect(await warpStake.withdrawsActive()).to.be.false;

    const [_, user] = await ethers.getSigners();

    const amount = parseUnits('10', await warpToken.decimals());
    await warpToken.connect(user).approve(warpStake.target, amount);
    await warpStake.connect(user).deposit(amount);

    await expect(warpStake.connect(user).withdraw()).to.be.revertedWith('Withdraws are restricted');
  });

  it('withdraws enabled', async () => {
    const { transferManager, warpStake, warpToken } = await loadFixture(deployWarpStake);

    const [_, user] = await ethers.getSigners();

    const amount = parseUnits('10', await warpToken.decimals());
    await warpToken.connect(user).approve(warpStake.target, amount);
    await warpStake.connect(user).deposit(amount);

    await warpStake.connect(transferManager).toggleWithdraws();
    expect(await warpStake.withdrawsActive()).to.be.true;

    const userBalanceBefore = await warpToken.balanceOf(user.address);
    const contractBalanceBefore = await warpToken.balanceOf(warpStake.target);

    await warpStake.connect(user).withdraw();

    expect(await warpStake.getUserAmount(user.address)).to.be.eq(0);
    expect(await warpStake.getTotalAmount()).to.be.eq(0);
    expect(await warpToken.balanceOf(warpStake.target)).to.be.eq(contractBalanceBefore - amount);
    expect(await warpToken.balanceOf(user.address)).to.be.eq(userBalanceBefore + amount);
  });

  it('deposits disabled', async () => {
    const { transferManager, warpStake, warpToken } = await loadFixture(deployWarpStake);

    await warpStake.connect(transferManager).toggleDeposits();
    expect(await warpStake.depositsActive()).to.be.false;

    const [_, user] = await ethers.getSigners();
    const amount = parseUnits('10', await warpToken.decimals());
    await warpToken.connect(user).approve(warpStake.target, amount);
    await expect(warpStake.connect(user).deposit(amount)).to.be.revertedWith('Deposits are restricted');
  });

  it('double withdraw fail', async () => {
    const { transferManager, warpStake, warpToken } = await loadFixture(deployWarpStake);

    const [_, user] = await ethers.getSigners();

    const amount = parseUnits('10', await warpToken.decimals());
    await warpToken.connect(user).approve(warpStake.target, amount);
    await warpStake.connect(user).deposit(amount);

    await warpStake.connect(transferManager).toggleWithdraws();
    expect(await warpStake.withdrawsActive()).to.be.true;

    await warpStake.connect(user).withdraw();
    await expect(warpStake.connect(user).withdraw()).to.be.revertedWith('Nothing to withdraw');
  });

  it('withdraw unknown user', async () => {
    const { transferManager, warpStake, warpToken } = await loadFixture(deployWarpStake);

    const [_, user1, user2] = await ethers.getSigners();

    const amount = parseUnits('10', await warpToken.decimals());
    await warpToken.connect(user1).approve(warpStake.target, amount);
    await warpStake.connect(user1).deposit(amount);

    await warpStake.connect(transferManager).toggleWithdraws();
    expect(await warpStake.withdrawsActive()).to.be.true;

    await expect(warpStake.connect(user2).withdraw()).to.be.revertedWith('Nothing to withdraw');
  });

  it('toggle withdraws onlyRole', async () => {
    const { warpStake } = await loadFixture(deployWarpStake);

    const [_, notManager] = await ethers.getSigners();
    await expect(warpStake.connect(notManager).toggleDeposits()).to.be.revertedWithCustomError(
      warpStake,
      'AccessControlUnauthorizedAccount'
    );
  });

  it('toggle deposits onlyRole', async () => {
    const { warpStake } = await loadFixture(deployWarpStake);

    const [_, notManager] = await ethers.getSigners();
    await expect(warpStake.connect(notManager).toggleWithdraws()).to.be.revertedWithCustomError(
      warpStake,
      'AccessControlUnauthorizedAccount'
    );
  });

  it('upgrade success', async () => {
    const { owner, warpStake } = await loadFixture(deployWarpStake);
    expect(function () {
      warpStake.interface.getFunctionName('upgradedTest');
    }).to.throw(TypeError);

    const warpStakeV2 = await upgrades.upgradeProxy(
      warpStake.target,
      new WarpStakeUpgradeTest__factory().connect(owner)
    );
    expect(await warpStakeV2.upgradedTest()).to.be.true;
  });

  it('upgrade not owner fail', async () => {
    const { warpStake } = await loadFixture(deployWarpStake);

    const [_, notOwner] = await ethers.getSigners();
    await expect(
      upgrades.upgradeProxy(warpStake.target, new WarpStakeUpgradeTest__factory().connect(notOwner))
    ).to.be.revertedWithCustomError(warpStake, 'OwnableUnauthorizedAccount');
  });
});
