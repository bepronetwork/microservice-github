const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const models = require('../models');

/* POST connect github handle and githubLogin */
router.post('/connect', asyncMiddleware(async (req, res, next) => {
  const find = await models.user.findOne({
    where: {
      githubLogin: req.body.githubLogin
    }
  })
  console.log(find)
  if(find){
    return res.status(404).json('already exist user');  
  }

  await models.user.create({
    githubHandle: req.body.githubHandle,
    githubLogin: req.body.githubLogin,
  });

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

   await user.update({
      githubHandle: user.githubHandle,
      githubLogin: user.githubLogin,
      address: req.body.address
    })

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
