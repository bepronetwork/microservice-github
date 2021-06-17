const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const IssueService = require('../services/issue.service');
const GithubService = require('../services/github.service');
const models = require('../models');

/* POST create issue. */
router.post('/', asyncMiddleware(async (req, res, next) => {
  const gitbubIssue = await GithubService.createIssue(req.body.title, req.body.description);

  await models.issue.create({
    issueId: req.body.issueId,
    githubId: gitbubIssue.number,
    state: 'draft',
  });

  return res.json('ok');
}));

/* GET list issues. */
router.get('/', asyncMiddleware(async (req, res, next) => {
  const whereCondition = {};

  if (req.body.filterState) {
    whereCondition.state = req.body.filterState;
  }

  const issues = await models.issue.findAll({ where: whereCondition, include: ['developers'] });

  const listOfIssues = [];
  for (const issue of issues) {
    listOfIssues.push(await IssueService.getIssueData(issue));
  }

  return res.json(listOfIssues);
}));

/* GET issue by issue id. */
router.get('/:id', asyncMiddleware(async (req, res, next) => {
  const issue = await models.issue.findOne(
    {
      where: {
        issueId: req.params.id
      },
      include: ['developers']
    });
  return res.json(await IssueService.getIssueData(issue));
}));

/* GET issue by github id. */
router.get('/github/:id', asyncMiddleware(async (req, res, next) => {
  const issue = await models.issue.findOne(
    {
      where: {
        githubId: req.params.id
      },
      include: ['developers']
    });
  return res.json(await IssueService.getIssueData(issue));
}));

/* GET Comments for issue. */
router.get('/github/:id/comments', asyncMiddleware(async (req, res, next) => {
  const githubComments = await GithubService.getIssueComments(req.params.id);

  return res.json(githubComments);
}));

module.exports = router;
