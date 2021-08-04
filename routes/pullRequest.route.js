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

  const commits = await GithubService.getPullRequestCommits(pullRequest.githubId);

  const participantsMap = new Map()

  for (const commit of commits) {
    const author = commit.commit.author.name;
    if (!participantsMap.has(author)) {
      const user = await models.user.findOne({ where: { githubHandle: author } });
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

module.exports = router;
