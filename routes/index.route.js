const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const BeproService = require('../services/bepro.service');
const GithubService = require('../services/github.service');

/* GET home page. */
router.get('/', asyncMiddleware((req, res, next) => {
  res.json('Github microservice!');
}));

router.get('/networkstats', asyncMiddleware(async (req, res, next) => {
  const openIssues = await BeproService.getOpenIssues();
  const beprosStaked = await BeproService.getBEPROStaked();
  const tokensStaked = await BeproService.getTokensStaked();

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
  const repos = [`bepro-js`, `web-network`, `landing-page`];
  // const data = await Promise.all(repos.map(GithubService.getForksAmountFor));

  res.json(await Promise.all(repos.map(GithubService.getForksAmountFor)));
})

module.exports = router;
