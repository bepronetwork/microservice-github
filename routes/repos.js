const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const models = require('../models');
const GithubService = require('../services/github.service');

async function getAllRepos(req, res, next) {
  return res.json(await models.repositories.findAll());
}

async function addNewRepo(req, res, next) {
  const issues = (await models.issues.findAndCountAll())?.count;
  if (issues)
    return res.status(422).json(`Database already has issues, can't do that now.`);

  if (!req.body?.owner || !req.body?.repo)
    return res.status(422).json(`wrong payload`);

  const {owner, repo} = req.body;
  const exists = await GithubService.repoExists(owner, repo)

  if (!exists)
    return res.status(404).json(`Github repo not found`);

  return models.repositories.create({githubPath: `${owner}/${repo}`})
    .then(async () => res.status(200).json(await models.repositories.findAll()))
    .catch(e => res.status(400).json(`Failed to create a repo: ${e.message}`));
}

router.get(`/`, asyncMiddleware(getAllRepos));
router.post(`/`, asyncMiddleware(addNewRepo));

module.exports = null;
