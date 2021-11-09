const Network = require('bepro-js').Network;
const networkConfig = require('../config/network.config');
const models = require('../models');
const GithubService = require('../services/github.service');
const Bus = require("../middlewares/event-bus.middleware");
const CronJob = require('cron').CronJob;

require('dotenv').config();

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

  static async updateBlockNumber(eventName, lastBlockNumber){
    try {
      await models.eventsLogs
      .findOne({ where: {event_name: eventName} })
      .then(function(obj) {
          if(obj) {
              return obj.update({event_name: eventName, lastBlockNumber});
          }
          else {
              return models.eventsLogs.create({event_name: eventName, lastBlockNumber});
          }
      })  
    } catch (err) {
      console.error(`Can't update LastBlock Number`, err)
    }
    
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

  static async syncConstractAllPastEvents(){
    const earliest = Number(process.env.CONTRACT_FIRST_BLOCK_NUMBER);
    const lastestBlock = await this.beproNetwork.web3.eth.getBlockNumber();

    const pageSize = 250;
    const totalBlocks = lastestBlock - earliest;

    let totalPages = Math.ceil(totalBlocks / pageSize);
    let startBlock = earliest;
    
    function cutDown(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    console.time('request')
    for (var i = 0; i < totalPages; i++) {
      let endBlock = startBlock + pageSize;
      await this.syncContractPastEvents(startBlock, endBlock)  
      cutDown(5000)
      startBlock = endBlock + 1;
    }
    console.timeEnd('request')
  }

  static async syncContractPastEvents(startBlock, endBlock = 'latest'){
    console.log(startBlock, endBlock)
    const contract = this.beproNetwork.getWeb3Contract();
    const connecting = +new Date()
    const onConnected = (eventName = ``) => console.log(`Connected ${eventName}`, +new Date() - connecting, `ms`);
    const getEventsLogs = async (event_name) => {
      const eventLog = await models.eventsLogs.findOne({where:{event_name}, raw: true})
      return eventLog.lastBlockNumber;
    }
    const findBlock = async (eventName = ``) => await getEventsLogs(eventName) || process.env.CONTRACT_FIRST_BLOCK_NUMBER || 0;

    const events = [
      {
        event_name: 'CloseIssue',
        action: this.readCloseIssue,
      },
      {
        event_name: 'RedeemIssue',
        action: this.readRedemIssue,
      },
      {
        event_name: 'RecognizedAsFinished',
        action: this.readRecognizeAsFinished,
      },
      {
        event_name:  'MergeProposalCreated',
        action: this.readMergeProposalCreated,
      }
    ]

    const getPastEvents = events.map(({event_name, action})=> 
      new Promise(async(resolve, reject) => {
        let fromBlock = startBlock || await findBlock(event_name);
        console.log(fromBlock, endBlock)
        await contract.getPastEvents(event_name, {
          fromBlock: fromBlock,
          toBlock: endBlock,
        })
        .then(async(evs)=> {
            console.log(event_name, evs)
            if(!evs || evs.length < 1) return;
            onConnected(event_name)
            const lastBlock = evs[evs?.length-1]?.blockNumber || 0;
            if(fromBlock <= lastBlock){
              await BeproService.updateBlockNumber(event_name, lastBlock)
              // await Promise.all(evs.map(async(ev) => action && await action(ev)))
            }
        })
        .catch((err)=> {
          console.error(`Err ${event_name}`, err)
        })
        resolve(true)
    }))
    
    
    return await Promise.all(getPastEvents)
    
  }

  static async listenToEvents() {
    if (BeproService.starting)
      return;
    
    return new Promise(async (resolve) => {
      
      BeproService.starting = +new Date();
      const started = await this.start();
      if (!started) return;

      const error = (of = ``) => (error, ev = null) => {
        console.log(`${of}\n`, `Error: ${!!error}`, error, `\n`, !ev && `No data` || ev);
        if (error?.code === 1006)
          BeproService.listenToEvents();
      }
      const connecting = +new Date()
      const onConnected = (eventName = ``) => console.log(`Connected ${eventName}`, +new Date() - connecting, `ms`);

      // this.syncConstractAllPastEvents();

      // await this.syncContractPastEvents();
      // console.log(result)
      // console.log(result, '<')
      // console.log('>>>', BeproService.beproNetwork.web3.eth.Contract.defaultBlock)
      // let taskRunning = false;
      // new CronJob({
      //   cronTime: '*/30 * * * * *',
      //   onTick: async () => {
      //     if(taskRunning) return;
      //     console.log('Runing Cron', new Date());
      //     taskRunning = true;
          
      //   },
      //   start: true,
      //   timeZone: 'Europe/Lisbon'
      // }).start()

      // contract.events.RedeemIssue({}, error(`redeemIssue`))
      //   .on(`connected`, () => onConnected(`RedeemIssue`))
      //   .on(`error`, error(`RedeemIssue`))
      //   .on(`data`, (ev) => BeproService.readRedemIssue(ev));

      // contract.events.RecognizedAsFinished({}, error(`RecognizedAsFinished`))
      //   .on(`connected`, () => onConnected(`RecognizedAsFinished`))
      //   .on(`error`, error(`RecognizedAsFinished`))
      //   .on(`data`, (ev) => BeproService.readRecognizeAsFinished(ev));

      // contract.events.MergeProposalCreated({}, error(`MergeProposalCreated`))
      //   .on(`connected`, () => onConnected(`MergeProposalCreated`))
      //   .on(`error`, error(`MergeProposalCreated`))
      //   .on(`data`, (ev) => BeproService.readMergeProposalCreated(ev));

      BeproService.beproNetwork.web3Connection.web3.currentProvider.once(`connect`, () => {
        onConnected(`CurrentProvider`);
        resolve(true);
      })

      BeproService.beproNetwork.web3Connection.web3.currentProvider.once(`close`, error(`CurrentProvider`))
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
