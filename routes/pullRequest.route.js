const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const GithubService = require('../services/github.service');
const models = require('../models');

/* GET Participants of a Pull Request. */
router.get('/:id/participants', asyncMiddleware(async (req, res, next) => {
  const pullRequest = await models.pullRequest.findOne(
    {
      where: {
        id: req.params.id
      },
    });

  const repo = await models.repositories.findOne({where: {id: issue?.repository_id}})
  const commits = await GithubService.getPullRequestCommits(pullRequest.githubId, repo?.githubPath);

  const participantsMap = new Map()

  for (const commit of commits) {
    const author = commit.commit.author.name;
    if (!participantsMap.has(author)) {
      const user = await models.user.findOne({ where: { githubHandle: author } });
      if(user)
      participantsMap.set(author, {
        githubHandle: author,
        address: user && user.address,
      });
    }
  }

  const participants = [];
  for (const participant of participantsMap.values()) {
    participants.push(participant);
  }

  return res.json(participants);
}));

router.get(`/last/:total`, asyncMiddleware(async (req, res, next) => {
  const pullRequests = await GithubService.getLastPullRequests(req.params.total);

  const prs = await models.pullRequest.findAll({ where: {githubId: (pullRequests || []).map(({number}) => number.toString())}});
  const issues = await models.issue.findAll({where: {issueId: (prs || []).map(({issueId}) => issueId.toString())}})

  const getTitleBody = ({githubId}) => {
    const {title, body} = pullRequests.find(_ => _.number === +githubId);
    return {title, body};
  }

  const getIssue = ({issueId}) => issues.find(_ => +_.issueId === +issueId);

  const response = [];
  for (const pr of prs)
    response.push({...getTitleBody(pr), ...getIssue(pr)?.dataValues})

  return res.json(response)
}));

module.exports = router;
