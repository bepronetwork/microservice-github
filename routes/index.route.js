const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const BeproService = require('../services/bepro.service');

/* GET home page. */
router.get('/', asyncMiddleware((req, res, next) => {
  res.json('Github microservice!');
}));

router.get('/networkstats', asyncMiddleware(async (req, res, next) => {
  const openIssues = await BeproService.getOpenIssues();
  const beprosStaked = await BeproService.getBEPROStaked();

  // TODO uncoment the next line and delete the other
  // const tokensStaked = await BeproService.getTokensStaked();
  const tokensStaked = 23;

  res.json({
    openIssues,
    beprosStaked,
    tokensStaked
  });
}));

module.exports = router;
