require('dotenv').config();
const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');

const indexRoutes = require('./routes/index.route');
const issuesRoutes = require('./routes/issue.route');
const developersRoutes = require('./routes/developer.route');
const usersRoutes = require('./routes/user.route');
const forksRoutes = require('./routes/fork.route');
const reposRoute = require('./routes/repos.route');
const pullRequestsRoutes = require('./routes/pullRequest.route');
const mergeProposalRoutes = require('./routes/merge-proposal.route');
const BeproService = require('./services/bepro.service');

const app = express();

const cors = require('cors');

// require('./cron');

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

function allow(from) {
  return JSON.parse(process.env.CORS_ORIGIN).includes(from);
}

const origin = (from, callback) =>
  process.env.CORS_ALLOW_NO_ORIGIN === "true"
    ? callback(null, true)
    : allow(from)
      ? callback(null, true)
      : callback(new Error(`Blocked by cors`), false)

const CORS = {
  origin,
  optionsSuccessStatus: 200
}

BeproService.listenToEvents().then((started) => {
  if (!started)
    return console.log(`Failed to start BeproService`);

  app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(cors(CORS));

  app.use('/', indexRoutes);
  app.use('/issues', issuesRoutes);
  app.use('/developers', developersRoutes);
  app.use('/users', usersRoutes);
  app.use('/forks', forksRoutes);
  app.use('/pullrequests', pullRequestsRoutes);
  app.use('/repos', reposRoute);
  app.use('/merge', mergeProposalRoutes);

// catch 404 and forward to error handler
  app.use((req, res, next) => {
    return res.status(404).json({ error: 'Route not Found' });
  });

// error handler
  app.use((err, req, res, next) => {
    console.error(err);
    return res.status(err.status || 500).json({ error: err?.message || `Error had no message` });
  });
});

module.exports = app;
