const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const IssueService = require('../services/issue.service');
const GithubService = require('../services/github.service');
const models = require('../models');
const paginate = require("../middlewares/paginate.middleware");
const {Op} = require("sequelize");
const {subWeeks, subMonths, subYears, subHours} = require('date-fns')

async function parseIssuesWithData(issues = []) {
  const reposKnown = {};

  for (const issue of issues) {
    if (reposKnown[issue.repository_id]) {
      issue.repo = reposKnown[issue.repository_id];
    } else {
      const repo = await models.repositories.findOne({where: {id: issue.repository_id}})
      issue.repo = repo?.githubPath;
      reposKnown[issue.repository_id] = repo?.githubPath;
    }
  }

  return IssueService.getIssuesData(issues)
}

async function composeIssues(issues) {
  for (const issue of issues) {
    const opts = {raw: true, nest: true, where: {issueId: issue?.id}};

    const developers = await models.developer.findAll(opts);
    const pullRequests = await models.pullRequest.findAll(opts)
    const mergeProposals = await models.mergeProposal.findAll(opts)

    Object.assign(issue, {developers, mergeProposals, pullRequests});
  }
}

/* POST create issue. */
router.post('/', asyncMiddleware(async (req, res, next) => {

  if(!req.body.creatorGithub)
    return res.status(422).json(`creatorGithub is required`);

  const repository = await models.repositories.findOne({where: {id: req.body.repository_id}});
  if (!repository)
    return res.status(422).json(`repository not found`)

  const githubId = req.body.githubIssueId || (await GithubService.createIssue(req.body.title, req.body.description, repository?.githubPath,))?.number?.toString()

  if (await models.issue.findOne({where: {githubId}}))
    return res.status(409).json(`issueId already exists on database`);

  await models.issue.create({
    // issueId: req.body.issueId,
    githubId,
    repository_id: req.body.repository_id,
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

  const {state, issueId, repoId, time} = req.query || {};

  if (state)
    whereCondition.state = state;

  if (issueId)
    whereCondition.issueId = issueId;

  if (repoId)
    whereCondition.repository_id = repoId;

  if (time) {

    let fn;
    if (time === `week`)
      fn = subWeeks
    if (time === `month`)
      fn = subMonths
    if (time === `year`)
      fn = subYears
    if (time === `hour`)
      fn = subHours

    if (!fn)
      return res.status(422).json(`Unable to parse date`);

    whereCondition.createdAt = {[Op.gt]: fn(+new Date(), 1)}
  }

  const issues = await models.issue.findAndCountAll(paginate({ where: whereCondition, raw: true, nest: true }, req.query));

  await composeIssues(issues?.rows);

  return parseIssuesWithData(issues?.rows).then(rows => res.json({rows, count: issues?.count}))
}));

router.get(`/pending`, asyncMiddleware(async (req, res,) => {
  const {login, address, repoId, githubId} = req.query || {};
  const where = {state: `pending`};

  if (login)
    where.creatorGithub = login;

  if (address)
    where.creatorAddress = {[Op.substring]: address};

  if (repoId)
    where.repository_id = repoId;

  if (githubId)
    where.githubId = githubId;

  const issues = await models.issue.findAll({where, raw: true, nest: true});

  return parseIssuesWithData(issues).then(data => res.json(data))
}))

/* GET issue by issue id. */
router.get('/:repoId/:id', asyncMiddleware(async (req, res, next) => {
  const issue = await models.issue.findOne(
    {
      where: {issueId: [req.params.repoId, req.params.id].join(`/`)},
    });

  await composeIssues([issue]);
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
      });
      issue.state = req.body.state;
      issue.save()
    return res.json(await IssueService.getIssueData(issue));
  } catch (error) {
    return res.status(400).json([`failed to update issue`]);
  }
}));

/* GET issue by github id. */
router.get('/github/:repoId/:id', asyncMiddleware(async (req, res, next) => {
  const issue = await models.issue.findOne(
    {
      where: {
        githubId: req.params.id,
        repository_id: req.params.repoId,
      },
      raw: true, nest: true,
    });

  await composeIssues([issue]);
  const [_issue] = await parseIssuesWithData([issue])
  return res.json(_issue);
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
router.get('/github/:id/:repo/comments', asyncMiddleware(async (req, res, next) => {
  const repo = await models.repositories.findOne({where: {id: req.params.repo}})
  const githubComments = await GithubService.getIssueComments(req.params.id, repo?.githubPath);

  return res.json(githubComments);
}));

/* POST create PR for issue. */
router.post('/:repoId/:id/pullrequest', asyncMiddleware(async (req, res, next) => {
  try{
    const issue = await models.issue.findOne(
      {
        where: {
          githubId: req.params.id,
          repository_id: req.params.repoId,
        },
      });

    const repo = await models.repositories.findOne({where: {id: issue?.repository_id}});
    const githubPR = await GithubService.createPullRequest(req.body.title, req.body.description, req.body.username, repo?.githubPath);

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
        issueId: req.params.issueId,
      },
      include: 'pullRequest'
    });

  return res.json(mergeProposal);
}));

/* POST create Merge proposal for issue. */
router.post('/:repoId/:id/mergeproposal', asyncMiddleware(async (req, res, next) => {
  if (!req.body.githubLogin)
    return res.status(422).json(`Wrong payload`);

  const issue = await models.issue.findOne(
    {
      where: {
        githubId: req.params.id,
        repository_id: req.params.repoId,
      },
    });

  if (!issue)
    return res.status(422).json(`Issue not found`);

  const pullRequest = await models.pullRequest.findOne(
    {
      where: {
        githubId: req.body.pullRequestGithubId.toString(),
      },
    });

  if (!pullRequest)
    return res.status(422).json(`PR not found`);

  await models.mergeProposal.create({
    scMergeId: req.body.scMergeId,
    issueId: issue?.id,
    pullRequestId: pullRequest?.id,
    githubLogin: req.body.githubLogin
  });

  return res.json('ok');
}));

/* GET issue by github login. */
router.get('/githublogin/:ghlogin', asyncMiddleware(async (req, res, next) => {
  const issues = await models.issue.findAndCountAll(
    paginate({ where:{ creatorGithub: req.params.ghlogin, state: {[Op.not]: `pending`} }, raw: true, nest: true }, req.query)
  );

  await composeIssues(issues?.rows);

  const rows = await parseIssuesWithData(issues?.rows);

  res.json({rows, count: issues?.count});
}));

/* PATCH issueId if no issueId  */
router.patch(`/github/:ghId/issueId/:repoId/:scId`, asyncMiddleware(async (req, res,) => {
  console.log(`params`, req.params)
  const {repoId, scId} = req.params;
  const issueId = [repoId,scId].join(`/`);
  return models.issue.update({issueId, state: `draft`}, {where: {githubId: req.params.ghId, issueId: null}})
    .then(result => {
      console.log('result', result);
      if (!result[0])
        return res.status(422).json(`nok`)

      return res.status(200).json(`ok`)
    })
    .catch(_ => res.status(422).json(`nok`));
}))

module.exports = router;
