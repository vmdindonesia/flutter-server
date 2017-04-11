'use strict';

module.exports = function(server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();
  var Members = server.models.Members;
  var AccessToken = server.models.AccessToken;
  var _ = require('lodash');

  router.get('/', server.loopback.status());

  router.get('/request-password-reset', function(req, res) {
    var message = req.query.message;

    res.render('reset-password', {
      message: message
    });
  });

  router.post('/request-password-reset', function(req, res) {
    Members.resetPassword({
      email: req.body.email
    }, function(err) {
      if (err) return res.status(401).send(err);

      var string = encodeURIComponent('Check your email for further instructions');
      res.redirect('/request-password-reset?message=' + string);
    });
  });

  router.get('/reset-password', function(req, res) {
    if (!req.query.access_token) return res.sendStatus(401);
    res.render('new-password', {
      accessToken: req.query.access_token
    });
  });

  router.post('/reset-password', function(req, res) {
    if (!req.query.access_token) return res.sendStatus(401);

    // verify passwords match
    if (!req.body.password || !req.body.password_confirmation || req.body.password !== req.body.password_confirmation) {
      return res.sendStatus(400, new Error('Passwords do not match'));
    }

    // Get user id from table token
    var accessToken = req.query.access_token;
    AccessToken.findOne({
      where: { id: accessToken }
    }, function(err, token) {
      if (err) return res.sendStatus(404);

      // Update table member
      Members.upsertWithWhere(
        { id: token.userId },
        { password: req.body.password }
      , function(err, user) {
        if (err) return res.sendStatus(404);

        var string = encodeURIComponent('Password reset processed successfully');
        res.redirect('/request-password-reset?message=' + string);
      });
    });
  });

  router.get('/verified', function (req, res) {
    res.render('verified');
  });

  server.use(router);
};
