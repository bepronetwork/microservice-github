const Network = require('bepro-js').Network;
const networkConfig = require('../config/network.config');
const models = require('../models');
const GithubService = require('../services/github.service');

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

      contract.events.CloseIssue({}, (error, event) => {
        if (error) {
          console.log('error:', error);
          console.log(event);
        }
      })
        .on('connected', () => {
          console.log('connected close issue');
        })
        .on('data', async (event) => {
          const eventData = event.returnValues;
          // Merge PR and close issue on github
          const issue = await models.issue.findOne(
            {
              where: {
                issueId: eventData.id,
              },
              include: ['mergeProposals'],
            });


          const mergeProposal = issue.mergeProposals.find((mp) => mp.scMergeId = eventData.mergeID);

          const pullRequest = await mergeProposal.getPullRequest();

          await GithubService.mergePullRequest(pullRequest.githubId);
          await GithubService.closeIssue(issue.githubId);
          issue.state = 'closed';
          await issue.save();
        })
        .on('error', (error, receipt) => {
          console.log('error', error);
        });

      contract.events.RedeemIssue({}, (error, event) => {
        if (error) {
          console.log('error:', error);
          console.log(event);
        }
      })
        .on("connected", () => {
          console.log('connected reedem');
        })
        .on('data', async (event) => {
          const eventData = event.returnValues;
          // Close issue on github
          const issue = await models.issue.findOne(
            {
              where: {
                issueId: eventData.id,
              },
            });


          await GithubService.closeIssue(issue.githubId);
          issue.state = 'redeemed';
          await issue.save();
        })
        .on('error', (error, receipt) => {
          console.log('error', error);
        });
    } catch (error) {
      console.log('###########################');
      console.log('error:', error);
    }
  }
};