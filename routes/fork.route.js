const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const GithubService = require('../services/github.service');

/* GET Forks for issue. */
router.get('/', asyncMiddleware(async (req, res, next) => {
  const forks = await GithubService.getIssueForks();

  return res.json(forks);
}));

/* GET Forked Repo by Github login*/
router.get('/repo/:handle/:repo', asyncMiddleware(async (req, res, next) => {
  const repo = await models.repositories.findOne({where: {id: req.params.repo}})
  const forks = await GithubService.getForkedRepo(req.params.handle, repo?.githubPath);

  return res.json(forks);
}));

module.exports = router;
