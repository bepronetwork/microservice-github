const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const models = require('../models');
const GithubService = require('../services/github.service');

/* POST start working on issue. */
router.post('/working/:issueId', asyncMiddleware(async (req, res, next) => {
  const issue = await models.issue.findOne(
    {
      where: {
        issueId: req.params.issueId
      }
    });

  const developer = await models.developer.create({
    issueId: issue.id,
    githubHandle: req.body.githubHandle,
    address: req.body.address,
  });

  const repo = await models.repositories.findOne({where: {id: issue?.repository_id}})

  await GithubService.createComment(issue.githubId, `${developer.githubHandle} is working on this`, repo?.githubPath)

  return res.json('ok');
}));

module.exports = router;
