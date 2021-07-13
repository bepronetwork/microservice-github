const Network = require('bepro-js').Network;
const networkConfig = require('../config/network.config');

module.exports = class BeproService {

  static async listenEvents() {
    try {
      const beproNetwork = new Network({
        contractAddress: networkConfig.contractAddress,
        test: true,
        opt: {
          web3Connection: networkConfig.web3Connection,
          privateKey: networkConfig.privateKey,
        },
      });

      await beproNetwork.start();

      const contract = beproNetwork.getWeb3Contract();

      contract.events.OpenIssue({}, (error, event) => {
        console.log('LISTENING TO EVENTS');
        console.log('error:', error);
        console.log(event);
      })
        .on("connected", function (subscriptionId) {
          console.log('connected:');
          console.log(subscriptionId);
        })
        .on('data', function (event) {
          console.log('data:');
          console.log(event); // same results as the optional callback above
        })
        .on('changed', function (event) {
          console.log('changed:', event);

        })
        .on('error', function (error, receipt) {
          console.log('error', error);
        });

    } catch (error) {
      console.log('###########################');
      console.log('error:', error);
    }
  }
};