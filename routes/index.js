const express = require('express');
const router = express.Router();
const asyncMiddleware = require('../middlewares/async');

/* GET home page. */
router.get('/', asyncMiddleware((req, res, next) => {
  res.json('Github microservice!');
}));

module.exports = router;
