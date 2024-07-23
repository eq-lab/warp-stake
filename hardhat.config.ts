import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-contract-sizer';

import './tasks/deploy';

import * as defaultConfig from './hardhat.common';

const config = {
  ...defaultConfig.default,
  networks: {
    ethereum: {
      url: "https://rpc.ankr.com/eth"
    },
    holesky: {
      url: 'https://ethereum-holesky-rpc.publicnode.com',
    },
    holesky2: {
      url: 'https://1rpc.io/holesky',
    }
  },
  etherscan: {
    apiKey: {
      holesky: ""
    }
  },
};

export default config;
