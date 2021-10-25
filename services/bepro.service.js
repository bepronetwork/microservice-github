const Network = require('bepro-js').Network;
const networkConfig = require('../config/network.config');
const models = require('../models');
const GithubService = require('../services/github.service');
const Bus = require("../middlewares/event-bus.middleware");

module.exports = class BeproService {

  static beproNetwork;
  static starting = false;

  static listeners = {};

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

  static async readRecognizeAsFinished(event) {
    // const {id: issueId} = event.returnValues;
    // const _issue = await BeproService.beproNetwork.getIssueById({issueId});
    // const issue = await models.issue.findOne({where: {issueId: issue.cid}});
    // issue.state = `finished`;
    // await issue.save();
  }

  static async readMergeProposalCreated(event) {
    const {id: scIssueId, mergeID: scMergeId, creator} = event.returnValues;
    const issueId = await BeproService.beproNetwork.getIssueById({issueId: scIssueId}).then(({cid}) => cid);

    const issue = await models.issue.findOne({where: {issueId,}});
    if (!issue)
      return console.log(`Failed to find an issue to add merge proposal`, event);

    const user = await models.user.findOne({where: {address: creator.toLowerCase()}});
    if (!user)
      return console.log(`Could not find a user for ${creator}`, event);

    const pr = await models.pullRequest.findOne({where: {issueId: issue?.id}});
    if (!pr)
      return console.log(`Could not find PR for db-issue ${issue?.id}`, event);

    const merge = await models.mergeProposal.create({
      scMergeId,
      issueId: issue?.id,
      pullRequestId: pr?.id,
    });

    console.log(`Emitting `, `mergeProposal:created:${user?.githubLogin}:${scIssueId}:${pr?.githubId}`);

    Bus.emit(`mergeProposal:created:${user?.githubLogin}:${scIssueId}:${pr?.githubId}`, merge)
  }

  static async listenToEvents() {
    if (BeproService.starting)
      return;

    return new Promise(async (resolve) => {
      BeproService.starting = +new Date();
      const started = await this.start();
      if (!started) return;

      const contract = BeproService.beproNetwork.getWeb3Contract();

      const error = (of = ``, reListen = () => {}) => (error, ev = null) => {
        console.log(`${of}\n`, `Error: ${!!error}`, error, `\n`, !ev && `No data` || ev);
        if (error?.code === 1006)
          reListen();
      }

      const connecting = +new Date()
      const onConnected = (eventName = ``) => console.log(`Connected ${eventName}`, +new Date() - connecting, `ms`);

      function listenCloseIssue() {
        contract.events.CloseIssue({}, error(`closeIssue`))
          .on(`connected`,() => onConnected(`CloseIssue`))
          .on(`error`, error(`CloseIssue`))
          .on(`data`, (ev) => BeproService.readCloseIssue(ev));
      }

      function listenRedeemIssue() {
        contract.events.RedeemIssue({}, error(`redeemIssue`))
          .on(`connected`, () => onConnected(`RedeemIssue`))
          .on(`error`, error(`RedeemIssue`))
          .on(`data`, (ev) => BeproService.readRedemIssue(ev));
      }

      function listenRecognizeAsFinished() {
        contract.events.RecognizedAsFinished({}, error(`RecognizedAsFinished`))
          .on(`connected`, () => onConnected(`RecognizedAsFinished`))
          .on(`error`, error(`RecognizedAsFinished`))
          .on(`data`, (ev) => BeproService.readRecognizeAsFinished(ev));
      }

      function listenMergeProposalCreated() {
        contract.events.MergeProposalCreated({}, error(`MergeProposalCreated`))
          .on(`connected`, () => onConnected(`MergeProposalCreated`))
          .on(`error`, error(`MergeProposalCreated`))
          .on(`data`, (ev) => BeproService.readMergeProposalCreated(ev));
      }

      listenCloseIssue();
      listenRedeemIssue();
      listenRecognizeAsFinished();
      listenMergeProposalCreated();

      BeproService.beproNetwork.web3Connection.web3.currentProvider.once(`connect`, () => {
        onConnected(`CurrentProvider`);
        resolve(true);
      })

      BeproService.beproNetwork.web3Connection.web3.currentProvider.once(`close`, error(`CurrentProvider`, this.listenToEvents))
      BeproService.beproNetwork.web3Connection.web3.currentProvider.once(`error`, error(`CurrentProvider`))

      console.log(`Started!`, +new Date() - BeproService.starting, `ms`)
      BeproService.starting = 0;
    })
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
