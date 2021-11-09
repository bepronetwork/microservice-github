const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const Network = require('bepro-js').Network;
const GithubService = require('../services/github.service');
const axios = require(`axios`);
const networkConfig = require("../config/network.config");

/* GET home page. */
router.get('/', asyncMiddleware((req, res, next) => {
  res.json('Github microservice!');
}));

router.get('/networkstats', asyncMiddleware(async (req, res, next) => {

  const opt = {opt: {web3Connection: networkConfig.web3Connection,  privateKey: networkConfig.privateKey}, test: true,};
  const network = new Network({contractAddress: networkConfig.contractAddress, ...opt});

  await network.start();

  const openIssues = await network.getAmountofIssuesOpened();
  const beprosStaked = await network.getBEPROStaked();
  const tokensStaked = await network.getTokensStaked();

  res.json({
    openIssues,
    beprosStaked,
    tokensStaked
  });
}));

router.get(`/repostats`, async (req, res) => {
  res.json(await GithubService.getLastCommits())
})

router.get(`/forkstats`, async (req, res) => {
  res.json(await GithubService.getForksOf([`bepro-js`, `web-network`, `landing-page`]));
})

router.get(`/ip`, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  res.json(await axios.get(`https://pro.ip-api.com/json/${ip}?key=${process.env.IP_API_KEY}&fields=status,message,countryCode,country`).then(({data}) => data))
})

router.get(`/ratelimit`, async(req, res) => {
  res.json(await GithubService.rateLimit());
})

// router.post(`/close/:id/:owner/:repo`, asyncMiddleware(async (req, res,) => res.json(await GithubService.closeIssue(req.params.id, `${req.params.owner}/${req.params.repo}`))))

module.exports = router;
