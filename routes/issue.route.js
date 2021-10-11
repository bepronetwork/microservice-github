const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const IssueService = require('../services/issue.service');
const GithubService = require('../services/github.service');
const models = require('../models');
const {Op} = require("sequelize");


const includeIssues = ['developers', 'pullRequests', 'mergeProposals'];

/* POST create issue. */
router.post('/', asyncMiddleware(async (req, res, next) => {

  if(!req.body.creatorGithub)
    return res.status(422).json(`creatorGithub is required`);
  
  const githubId = req.body.githubIssueId || (await GithubService.createIssue(req.body.title, req.body.description))?.number?.toString()

  if (await models.issue.findOne({where: {githubId}}))
    return res.status(409).json(`issueId already exists on database`);

  await models.issue.create({
    // issueId: req.body.issueId,
    githubId,
    creatorAddress: req.body.creatorAddress,
    creatorGithub: req.body.creatorGithub,
    amount: req.body.amount,
    state: 'pending',
  });

  return res.json(githubId);
}));

/* GET list issues. */
router.get('/', asyncMiddleware(async (req, res, next) => {
  const whereCondition = {};
  const page = +req.query.page || 1;
  const limit = +req.query.limit || 10000;
  let offset = page * limit - limit;

  if (req.query.filterState) {
    whereCondition.state = req.query.filterState;
  }

  if (req.query.issueIds) {
    whereCondition.issueId = req.query.issueIds;
  }

  const issues = await models.issue.findAndCountAll({ 
    where: whereCondition, 
    include: includeIssues, 
    raw: true, 
    nest: true,
    offset,
    limit 
  });
  const maxPage = parseInt((issues?.count/limit),10);
  return IssueService.getIssuesData(issues.rows)
  .then(data => res.json({issuesData: data, nextPage: page + 1 <= maxPage , currentPage: page, pages: maxPage, count: issues?.count}))
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

/* PUT update issue */
router.put('/:id', asyncMiddleware(async (req, res, next) => {
  try {
    const issue = await models.issue.findOne(
      {
        where: {
          issueId: req.params.id
        },
        include: includeIssues,
      });
      issue.state = req.body.state;
      issue.save()
    return res.json(await IssueService.getIssueData(issue));
  } catch (error) {
    return res.status(400).json([`failed to update issue`]);
  }
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

/* PUT update issue by github id */
router.put('/github/:id', asyncMiddleware(async (req, res, next) => {
  try {
    const issue = await models.issue.findOne(
      {
        where: {
          githubId: req.params.id
        },
        include: includeIssues,
      });
      issue.state = req.body.state;
      issue.save()
    return res.json(await IssueService.getIssueData(issue));
  } catch (error) {
    return res.status(400).json([`failed to update issue`]);
  }
}));

/* GET Comments for issue. */
router.get('/github/:id/comments', asyncMiddleware(async (req, res, next) => {
  const githubComments = await GithubService.getIssueComments(req.params.id);

  return res.json(githubComments);
}));

/* POST create PR for issue. */
router.post('/:id/pullrequest', asyncMiddleware(async (req, res, next) => {
  try{
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
  }catch(e){
    console.error(e);
    return res.status(e?.status || 400).json([...(e.response?.data?.errors || e.errors || [`failed to create pull request`])]);
  }
}));

/* Get Merge proposal for issue. */
router.get('/mergeproposal/:scMergeId/:issueId', asyncMiddleware(async (req, res, next) => {
  const mergeProposal = await models.mergeProposal.findOne(
    {
      where: {
        scMergeId: req.params.scMergeId,
        issueId: req.params.issueId
      },
      include: 'pullRequest'
    });

  return res.json(mergeProposal);
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
        githubId: req.body.pullRequestGithubId.toString(),
      },
    });

  await models.mergeProposal.create({
    scMergeId: req.body.scMergeId,
    issueId: issue.id,
    pullRequestId: pullRequest.id,
    githubLogin: req.body.githubLogin
  });

  return res.json('ok');
}));

/* GET issue by github login. */
router.get('/githublogin/:ghlogin', asyncMiddleware(async (req, res, next) => {
  const issues = await models.issue.findAll({
    where:{
      creatorGithub: req.params.ghlogin
    },
    include: includeIssues });

  const listOfIssues = [];
  for (const issue of issues) {
    listOfIssues.push(await IssueService.getIssueData(issue));
  }

  return res.json(listOfIssues);
}));

/* PATCH issueId if no issueId  */
router.patch(`/github/:ghId/issueId/:scId`, asyncMiddleware(async (req, res,) => {
  return models.issue.update({issueId: req.params.scId, state: `draft`}, {where: {githubId: req.params.ghId, issueId: null}})
    .then(result => {
      if (!result[0])
        return res.status(422).json(`nok`)

      return res.status(200).json(`ok`)
    })
    .catch(_ => res.status(422).json(`nok`));
}))

module.exports = router;
