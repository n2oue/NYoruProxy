var express = require('express');
var router = express.Router();
var api = require('../api');

router.post('/1/', function(req, res, next) {
  api.upload(req, res, next);
});

router.get('/auth/twitter', function(req, res, next) {
  api.requestToken(req, res, next);
});

router.get('/auth/twitter/callback', function(req, res, next) {
  api.accessToken(req, res, next);
});

module.exports = router;
