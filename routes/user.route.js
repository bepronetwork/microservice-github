const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async.middleware');
const models = require('../models');

/* POST connect github handle to address. */
router.post('/connect', asyncMiddleware(async (req, res, next) => {
  await models.user.create({
    githubHandle: req.body.githubHandle,
    address: req.body.address,
  });

  return res.json('ok');
}));

/* GET get user by address. */
router.get('/address', asyncMiddleware(async (req, res, next) => {
  const user = await models.user.findOne(
    {
      where: {
        address: req.body.address
      },
    });

  return res.json(user);
}));

module.exports = router;
