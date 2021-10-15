const Network = require('bepro-js').Network;
const networkConfig = require('../config/network.config');
const models = require('../models');
const GithubService = require('../services/github.service');

module.exports = class BeproService {

  static beproNetwork;
  static starting = false;

  static async start() {
    try {

      console.log(`Starting Network Service...`);
      console.table(networkConfig)

      BeproService.beproNetwork = new Network({
        contractAddress: networkConfig.contractAddress,
        test: !networkConfig.prod,
        opt: {
          web3Connection: networkConfig.web3Connection,
          privateKey: networkConfig.privateKey,
        },
      });

      await BeproService.beproNetwork.start();

      return true;
    } catch (e) {
      console.log(`Problem starting...`, e);
      return false;
    }
  }

  static async readCloseIssue(event) {
    const eventData = event.returnValues;
    // Merge PR and close issue on github
    const issueId = await BeproService.beproNetwork.getIssueById({issueId: eventData.id}).then(({cid}) => cid);
    const issue = await models.issue.findOne({where: {issueId,}, include: ['mergeProposals'],});
    const mergeProposal = issue.mergeProposals.find((mp) => mp.scMergeId = eventData.mergeID);

    const pullRequest = await mergeProposal.getPullRequest();

    const repo = await models.repositories.findOne({where: {id: issue?.repository_id}})

    await GithubService.mergePullRequest(pullRequest.githubId, repo?.githubPath);
    await GithubService.closeIssue(issue.githubId, repo?.githubPath);

    issue.state = 'closed';
    await issue.save();
  }

  static async readRedemIssue(event) {
    const eventData = event.returnValues;
    const issueId = await BeproService.beproNetwork.getIssueById({issueId: eventData.id}).then(({cid}) => cid);
    const issue = await models.issue.findOne({where: {issueId,}});
    const repo = await models.repositories.findOne({where: {id: issue?.repository_id}})
    await GithubService.closeIssue(issue.githubId, repo?.githubPath);
    issue.state = 'canceled';
    await issue.save();
  }

  static async listenToEvents() {
    if (BeproService.starting)
      return;

    BeproService.starting = +new Date();
    const started = await this.start();
    if (!started) return;

    const contract = BeproService.beproNetwork.getWeb3Contract();

    const error = (of = ``) => (error, ev = null) => {
      console.log(`EventError: ${of}\n`, error, `\n---`, !ev && `Error had no event` || ev);
      if (error?.code === 1006)
        BeproService.listenToEvents();
    }

    const connecting = +new Date()
    const onConnected = (eventName = ``) => console.log(`Connected ${eventName}`, +new Date() - connecting, `ms`);

    contract.events.CloseIssue({}, error(`closeIssue`))
      .on(`connected`,() => onConnected(`CloseIssue`))
      .on(`error`, (err, ev) => error(`CloseIssue`)(err, ev))
      .on(`data`, (ev) => BeproService.readCloseIssue(ev));

    contract.events.RedeemIssue({}, error(`redeemIssue`))
      .on(`connected`, () => onConnected(`RedeemIssue`))
      .on(`error`, error(`RedeemIssue`))
      .on(`data`, (ev) => BeproService.readRedemIssue(ev));

    console.log(`Started!`, +new Date() - BeproService.starting, `ms`)
    BeproService.starting = 0;

    return true;
  }

  static async getOpenIssues() {
    return BeproService.beproNetwork.getAmountofIssuesOpened()
      .catch(e => {
        console.log(`Error while getOpenIssues`, e)
        return 0;
      });
  }

  static async getBEPROStaked() {
    return BeproService.beproNetwork.getBEPROStaked()
      .catch(e => {
        console.log(`Error while getBEPROStaked`, e)
        return 0;
      });
  }

  static async getTokensStaked() {
    return BeproService.beproNetwork.getTokensStaked()
      .catch(e => {
        console.log(`Error while getBEPROStaked`, e)
        return 0;
      });
  }

  static async getEthAmountOf(address = ``) {

  }

};
