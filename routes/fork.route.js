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
router.get('/repo/:handle/:issueId', asyncMiddleware(async (req, res, next) => {
  const issue = await models.issue.findOne({where: {issueId: req.params.issueId}});
  if (!issue)
    return res.status(404).json(`Not found`);

  const repo = await models.repository.findOne({where: {id: issue?.repository_id}});
  if (!repo)
    return res.status(422).json(`Repo not found`);

  const forks = await GithubService.getForkedRepo(req.params.handle, repo?.githubPath);

  return res.json(forks);
}));

module.exports = router;
