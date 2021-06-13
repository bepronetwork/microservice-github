const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const issueModel = require('../models/issue.model');
const asyncMiddleware = require('../services/github.service');
const models = require('../models');

/* POST create issue. */
router.post('/', asyncMiddleware((req, res, next) => {

  const gitbubIssue = await GithubService.createIssue(req.body.title, req.body.description);

  await models.issue.create({
    issueId: req.body.issueId,
    githubId: gitbubIssue.id,
    state: 'draft',
  });

  return res.json('ok');
}));

/* GET list issues. */
router.post('/', asyncMiddleware((req, res, next) => {
  const whereCondition = {};

  if (req.body.filterState) {
    whereCondition.state = req.body.filterState;
  }

  const issues = await models.issue.find({ where: whereCondition });

  for (const issue of issues) {
    const githubIssue = await GithubService.getIssueById(issue.githubId);
  }

  return res.json('ok');
}));

module.exports = router;
