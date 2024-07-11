// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.8.26;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol';

contract WarpStake is UUPSUpgradeable, Ownable2StepUpgradeable, AccessControlUpgradeable {
  using SafeERC20 for IERC20;

  event Deposit(address indexed user, uint256 amount);
  event Withdraw(address indexed user, uint256 amount);

  /// @custom:storage-location erc7201:eq-lab.storage.WarpStakeStorage
  struct WarpStakeStorage {
    IERC20 token;
    bool depositsActive;
    bool withdrawsActive;
    uint256 totalAmount;
    uint256 maxIndex;
    mapping(address user => uint256) indexes;
    mapping(uint256 index => uint256) amounts;
  }

  /// @dev 'WarpStakeStorage' storage slot address
  /// @dev keccak256(abi.encode(uint256(keccak256("eq-lab.storage.WarpStakeStorage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 private constant WarpStakeStorageLocation =
    0x7cf61d74604c9b2754f0cc616d4b397c650ea8e72a09883b0602115ae0930700;

  bytes32 public constant TRANSFER_MANAGER = keccak256('TRANSFER_MANAGER');

  function initialize(address token, address transferManager) external initializer {
    __Ownable_init(msg.sender);
    __AccessControl_init();
    __UUPSUpgradeable_init();
    WarpStakeStorage storage $ = _getWarpStakeStorage();
    $.token = IERC20(token);
    $.depositsActive = true;
    _grantRole(TRANSFER_MANAGER, transferManager);
  }

  /// @dev method called during the contract upgrade
  function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

  /// @dev returns storage slot of 'AaveInteractorData' struct
  function _getWarpStakeStorage() private pure returns (WarpStakeStorage storage $) {
    assembly {
      $.slot := WarpStakeStorageLocation
    }
  }

  function deposit(uint256 amount) external {
    _deposit(amount);
  }

  function withdraw() external returns (uint256) {
    return _withdraw();
  }

  function toggleDeposits() external onlyRole(TRANSFER_MANAGER) {
    _toggleDeposits();
  }

  function toggleWithdraws() external onlyRole(TRANSFER_MANAGER) {
    _toggleWithdraws();
  }

  function getToken() external view returns (address) {
    return address(_getWarpStakeStorage().token);
  }

  function getMaxIndex() external view returns (uint256) {
    return _getWarpStakeStorage().maxIndex;
  }

  function getTotalAmount() external view returns (uint256) {
    return _getWarpStakeStorage().totalAmount;
  }

  function getUserIndex(address user) external view returns (uint256) {
    return _getWarpStakeStorage().indexes[user];
  }

  function getIndexAmount(uint256 index) external view returns (uint256) {
    return _getWarpStakeStorage().amounts[index];
  }

  function depositsActive() external view returns (bool) {
    return _getWarpStakeStorage().depositsActive;
  }

  function withdrawsActive() external view returns (bool) {
    return _getWarpStakeStorage().withdrawsActive;
  }

  function _deposit(uint256 amount) private {
    require(amount != 0, 'Zero amount');
    WarpStakeStorage storage $ = _getWarpStakeStorage();
    require($.depositsActive, 'Deposits are restricted');

    uint256 userIndex = $.indexes[msg.sender];
    if (userIndex == 0) {
      userIndex = ++$.maxIndex;
      $.indexes[msg.sender] = userIndex;
    }

    $.token.safeTransferFrom(msg.sender, address(this), amount);
    $.totalAmount += amount;
    $.amounts[userIndex] += amount;

    emit Deposit(msg.sender, amount);
  }

  function _withdraw() private returns (uint256 withdrawAmount) {
    WarpStakeStorage storage $ = _getWarpStakeStorage();
    require($.withdrawsActive, 'Withdraws are restricted');

    uint256 userIndex = $.indexes[msg.sender];
    require(userIndex != 0, 'Unknown user');

    withdrawAmount = $.amounts[userIndex];
    require(withdrawAmount != 0, 'Already withdrawn');

    $.token.safeTransfer(msg.sender, withdrawAmount);
    $.totalAmount -= withdrawAmount;
    delete $.amounts[userIndex];

    emit Withdraw(msg.sender, withdrawAmount);
  }

  function _toggleDeposits() private {
    WarpStakeStorage storage $ = _getWarpStakeStorage();
    $.depositsActive = !$.depositsActive;
  }

  function _toggleWithdraws() private {
    WarpStakeStorage storage $ = _getWarpStakeStorage();
    $.withdrawsActive = !$.withdrawsActive;
  }
}
