const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const IssueService = require('../services/issue.service');
const GithubService = require('../services/github.service');
const models = require('../models');


const includeIssues = ['developers', 'pullRequests', 'mergeProposals'];

/* POST create issue. */
router.post('/', asyncMiddleware(async (req, res, next) => {
  const gitbubIssue = await GithubService.createIssue(req.body.title, req.body.description);

  await models.issue.create({
    issueId: req.body.issueId,
    githubId: gitbubIssue.number,
    creatorAddress: req.body.creatorAddress,
    creatorGithub: req.body.creatorGithub,
    amount: req.body.amount,
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
  if (req.query.issueIds) {
    whereCondition.issueId = req.query.issueIds;
  }

  const issues = await models.issue.findAll({ where: whereCondition, include: includeIssues });

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
      include: includeIssues,
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
      include: includeIssues,
    });
  return res.json(await IssueService.getIssueData(issue));
}));

/* GET Comments for issue. */
router.get('/github/:id/comments', asyncMiddleware(async (req, res, next) => {
  const githubComments = await GithubService.getIssueComments(req.params.id);

  return res.json(githubComments);
}));

/* POST create PR for issue. */
router.post('/:id/pullrequest', asyncMiddleware(async (req, res, next) => {
  const issue = await models.issue.findOne(
    {
      where: {
        issueId: req.params.id
      },
    });

  const githubPR = await GithubService.createPullRequest(req.body.title, req.body.description, req.body.username);
  await models.pullRequest.create({
    issueId: issue.id,
    githubId: githubPR.number,
  });

  issue.state = 'ready';
  await issue.save();

  return res.json('ok');
}));

/* POST create Merge proposal for issue. */
router.post('/:id/mergeproposal', asyncMiddleware(async (req, res, next) => {
  const issue = await models.issue.findOne(
    {
      where: {
        issueId: req.params.id
      },
    });
  const pullRequest = await models.pullRequest.findOne(
    {
      where: {
        githubId: req.body.pullRequestGithubId,
      },
    });

  await models.mergeProposal.create({
    scMergeId: req.body.scMergeId,
    issueId: issue.id,
    pullRequestId: pullRequest.id,
  });

  return res.json('ok');
}));

module.exports = router;
