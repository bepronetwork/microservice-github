const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const GithubService = require('../services/github.service');
const models = require('../models');

/* GET Forks for issue. */
router.get('/', asyncMiddleware(async (req, res, next) => {
  const forks = await GithubService.getIssueForks();

  return res.json(forks);
}));

/* GET Forked Repo by Github login*/
router.get('/repo/:handle/:repoId/:issueId', asyncMiddleware(async (req, res, next) => {
  const issue = await models.issue.findOne({where: {githubId: req.params.issueId,}});
  if (!issue)
    return res.status(404).json(`Not found`);

  const repo = await models.repositories.findOne({where: {id: req.params.repoId}});
  if (!repo)
    return res.status(422).json(`Repo not found`);

  const forks = await GithubService.getForkedRepo(req.params.handle, repo?.githubPath);

  return res.status(!forks ? 404 : 200).json(forks);
}));

module.exports = router;
