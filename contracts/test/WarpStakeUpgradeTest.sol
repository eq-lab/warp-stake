// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.26;

import '../WarpStake.sol';

contract WarpStakeUpgradeTest is WarpStake {
  function upgradedTest() external pure returns (bool) {
    return true;
  }
}
