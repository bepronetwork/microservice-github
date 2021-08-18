module.exports = {
  contractAddress: process.env.NETWORK_CONTRACT_ADDRESS,
  privateKey: process.env.NETWORK_PRIVATE_KEY,
  web3Connection: process.env.NETWORK_WEB3_CONNECTION,
  prod: process.env.PRODUCTION || false
};
