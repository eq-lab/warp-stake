import '@nomicfoundation/hardhat-toolbox';
// import 'solidity-docgen';
import * as defaultConfig from './hardhat.common';

const config = {
  ...defaultConfig.default,
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: 'https://rpc.ankr.com/eth',
        blockNumber: 20090225,
      },
      initialBaseFeePerGas: 0,
    },
  },
};

export default config;
