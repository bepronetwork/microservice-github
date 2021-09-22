const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const models = require('../models');

const timers = {};

/* POST connect github handle and githubLogin */
router.post('/connect', asyncMiddleware(async (req, res, next) => {

  const find = await models.user.findOne({
    where: {
      githubLogin: req.body.githubLogin
    }
  })

  if (!find) {
    await models.user.create({
      githubHandle: req.body.githubHandle,
      githubLogin: req.body.githubLogin,
    });

    timers[req.body.githubHandle] = setTimeout(async () => await models.user.destroy({where: {githubLogin: req.body.githubLogin}}), 60*1000)
  } else
    return res.status(409).json(`already exists`);

  return res.status(204).json('ok');
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
    return res.status(400).json(`user not found`);

  if (user.address)
    return res.status(409).json(`user already joined`);

   await user.update({
      githubHandle: user.githubHandle,
      githubLogin: user.githubLogin,
      address: req.body.address
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

module.exports = router;
