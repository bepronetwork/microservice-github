require('dotenv').config();
const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');

const indexRoutes = require('./routes/index');

const app = express();

const cors = require('cors');

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());

app.use('/', indexRoutes);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  return res.status(404).json({ error: 'Route not Found' });
});

// error handler
app.use((err, req, res, next) => {
  const message = req.app.get('env') === 'development' ? err.message : 'Unknown Error';

  console.log(err);
  return res.status(err.status || 500).json({ error: message });
});

module.exports = app;
