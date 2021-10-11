const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const models = require('../models');
const GithubService = require('../services/github.service');
const BeproService = require('../services/bepro.service');

const timers = {};


/* POST connect github handle and githubLogin */
router.post('/connect', asyncMiddleware(async (req, res, next) => {
  if (!req.body || !req.body.githubLogin || !req.body.githubHandle || !req.body.accessToken)
    return res.status(422).json(`wrong payload`)

  const githubUser = await GithubService.getUser(req.body.githubLogin);

  if (!githubUser)
    return res.status(404).json(`Spam Error: User not found on Github`);

  const {created_at, public_repos} = githubUser;
  const moreThanADay = (+new Date() - +new Date(created_at)) / (24 * 60 * 60 * 1000) >= 7;

  if (!moreThanADay)
    return res.status(422).json(`Spam Error: Github account has to be older than 7 days`);

  if (!public_repos)
    return res.status(422).json(`Spam Error: Github Account has to have at least 1 public repository`);

  const find = await models.user.findOne({
    where: {
      githubLogin: req.body.githubLogin
    }
  })

  if (!find) {
    await models.user.create({
      githubHandle: req.body.githubHandle,
      githubLogin: req.body.githubLogin,
      accessToken: req.body.accessToken,
    });

    timers[req.body.githubHandle] = setTimeout(async () => await models.user.destroy({where: {githubLogin: req.body.githubLogin}}), 60*1000)
  } else
    return res.status(409).json(`already exists`);

  return res.status(200).json('ok');
}));

/* PATCH adding address to user with githubHandle */
router.patch('/connect/:githubHandle', asyncMiddleware(async (req, res, next) => {
  const user = await models.user.findOne(
    {
      where: {
        githubHandle: req.params.githubHandle
      },
    });

  if (user === null)
    return res.status(400).json(`Spam Error: user not found`);

  if (user.address)
    return res.status(409).json(`Spam Error: user already joined`);

  if (!+(await BeproService.beproNetwork.web3.eth.getBalance(req.body.address)))
    return res.status(422).json(`Spam Error: Address has to hold Native Currency`);

   await user.update({
      githubHandle: user.githubHandle,
      githubLogin: user.githubLogin,
      address: req.body.address,
      accessToken: req.body.accessToken,
    })

  if (timers[user.githubHandle])
    clearInterval(timers[user.githubHandle]);

  return res.status(204).json('ok');
}));

/* GET get user by address. */
router.get('/address/:address', asyncMiddleware(async (req, res, next) => {
  const user = await models.user.findOne(
    {
      where: {
        address: req.params.address
      },
    });

  return res.json(user);
}));

/* GET get number of developers connected. */
router.get('/total', asyncMiddleware(async (req, res, next) => {
  const userCount = await models.user.count();

  return res.json(userCount);
}));

router.get(`/all`, asyncMiddleware(async (req, res, next) => {
  res.status(200).json(await models.user.findAll())
}))

router.delete(`/github/login`, asyncMiddleware( async (req, res, next) => {}))

module.exports = router;
