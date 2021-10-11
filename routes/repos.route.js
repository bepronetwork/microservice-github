const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const models = require('../models');
const GithubService = require('../services/github.service');

async function getAllRepos(req, res, next) {
  return res.json(await models.repositories.findAll());
}

async function addNewRepo(req, res, next) {
  const issues = (await models.issue.findAndCountAll())?.count;
  if (issues)
    return res.status(422).json(`Database already has issues, can't do that now.`);

  if (!req.body?.owner || !req.body?.repo)
    return res.status(422).json(`wrong payload`);

  const {owner, repo} = req.body;
  const exists = await GithubService.repoExists(owner, repo)

  if (!exists)
    return res.status(404).json(`Github repo not found`);

  const found = await models.repositories.findOne({where: {githubPath: `${owner}/${repo}`}})
  if (found)
    return res.status(409).json(`Path already exists`);

  const created = await models.repositories.create({githubPath: `${owner}/${repo}`})
    .then(() => ({error: false}))
    .catch(e => ({error: e.message}));

  res.status(!created?.error ? 200 : 400).json(!created?.error ? `ok` : created.error)
}

async function removeRepo(req, res,) {

  const issues = (await models.issue.findAndCountAll())?.count;
  if (issues)
    return res.status(422).json(`Database already has issues, can't do that now.`);

  const id = req.params.id;

  const found = await models.repositories.findOne({where: {id}});
  if (!found)
    return res.status(404).json(`id not found`);

  const deleted = await found.destroy();

  res.status(!deleted ? 422 : 200).json(!deleted ? `Couldn't delete entry ${id}` : `ok`);

}

router.get(`/`, asyncMiddleware(getAllRepos));
router.post(`/`, asyncMiddleware(addNewRepo));
router.delete(`/:id`, asyncMiddleware(removeRepo));

module.exports = router;
