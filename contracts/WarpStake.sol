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
    bool withdrawalsActive;
    uint256 totalAmount;
    uint256 maxIndex;
    mapping(address user => uint256) indexes;
    mapping(uint256 index => address) users;
    mapping(address user => uint256) amounts;
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
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
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

  function enableDeposits() external onlyRole(TRANSFER_MANAGER) {
    _enableDeposits();
  }

  function disableDeposits() external onlyRole(TRANSFER_MANAGER) {
    _disableDeposits();
  }

  function enableWithdrawals() external onlyRole(TRANSFER_MANAGER) {
    _enableWithdrawals();
  }

  function disableWithdrawals() external onlyRole(TRANSFER_MANAGER) {
    _disableWithdrawals();
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

  function getUserByIndex(uint256 index) external view returns (address) {
    return _getWarpStakeStorage().users[index];
  }

  function getUserIndex(address user) external view returns (uint256) {
    return _getWarpStakeStorage().indexes[user];
  }

  function getUserAmount(address user) external view returns (uint256) {
    return _getWarpStakeStorage().amounts[user];
  }

  function depositsActive() external view returns (bool) {
    return _getWarpStakeStorage().depositsActive;
  }

  function withdrawalsActive() external view returns (bool) {
    return _getWarpStakeStorage().withdrawalsActive;
  }

  function _deposit(uint256 amount) private {
    require(amount != 0, 'Zero amount');
    WarpStakeStorage storage $ = _getWarpStakeStorage();
    require($.depositsActive, 'Deposits are restricted');

    uint256 userIndex = $.indexes[msg.sender];
    if (userIndex == 0) {
      userIndex = ++$.maxIndex;
      $.indexes[msg.sender] = userIndex;
      $.users[userIndex] = msg.sender;
    }

    $.token.safeTransferFrom(msg.sender, address(this), amount);
    $.totalAmount += amount;
    $.amounts[msg.sender] += amount;

    emit Deposit(msg.sender, amount);
  }

  function _withdraw() private returns (uint256 withdrawAmount) {
    WarpStakeStorage storage $ = _getWarpStakeStorage();
    require($.withdrawalsActive, 'Withdrawals are restricted');

    withdrawAmount = $.amounts[msg.sender];
    require(withdrawAmount != 0, 'Nothing to withdraw');

    $.token.safeTransfer(msg.sender, withdrawAmount);
    $.totalAmount -= withdrawAmount;
    delete $.amounts[msg.sender];

    emit Withdraw(msg.sender, withdrawAmount);
  }

  function _enableDeposits() private {
    WarpStakeStorage storage $ = _getWarpStakeStorage();
    require(!$.depositsActive, 'Deposits are already enabled');
    $.depositsActive = true;
  }

  function _disableDeposits() private {
    WarpStakeStorage storage $ = _getWarpStakeStorage();
    require($.depositsActive, 'Deposits are already disabled');
    $.depositsActive = false;
  }

  function _enableWithdrawals() private {
    WarpStakeStorage storage $ = _getWarpStakeStorage();
    require(!$.withdrawalsActive, 'Withdrawals are already enabled');
    $.withdrawalsActive = true;
  }

  function _disableWithdrawals() private {
    WarpStakeStorage storage $ = _getWarpStakeStorage();
    require($.withdrawalsActive, 'Withdrawals are already disabled');
    $.withdrawalsActive = false;
  }
}
