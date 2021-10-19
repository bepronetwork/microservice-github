const express = require('express');
const router = express.Router();
const models = require('../models');
const asyncMiddleware = require('../middlewares/async.middleware');
const Bus = require('../middlewares/event-bus.middleware');

async function getMergeFromPrId(req, res,) {
  const {login, scId, ghPrId,} = req.params || {};
  console.log(`Listening `, `mergeProposal:created:${login}:${scId}:${ghPrId}`)
  Bus.once(`mergeProposal:created:${login}:${scId}:${ghPrId}`, (merge) => res.json(merge));
}

async function getMergeFromScMergeId(req, res) {
  const merge = await models.mergeProposal.findOne({where: {scMergeId: req.params.scMergeId}, include: [models.pullRequest, models.issue], raw: true, nest: true});
  if (!merge)
    return res.status(404).json(`Merge not found`);

  res.status(200).json(merge);
}

router.get(`/created/for/:login/:scId/:ghPrId`, asyncMiddleware(getMergeFromPrId))
router.get(`/scMergeId/:scMergeId`, asyncMiddleware(getMergeFromScMergeId))
module.exports = router;
