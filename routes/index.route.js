const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const BeproService = require('../services/bepro.service');
const GithubService = require('../services/github.service');
const axios = require(`axios`);

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
  res.json(await GithubService.getForksOf([`bepro-js`, `web-network`, `landing-page`]));
})

router.get(`/ip`, async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  res.json(await axios.get(`https://pro.ip-api.com/json/${ip}?key=${process.env.IP_API_KEY}&fields=status,message,countryCode,country`).then(({data}) => data))
})

router.get(`/ratelimit`, async(req, res) => {
  res.json(await GithubService.rateLimit());
})

module.exports = router;
