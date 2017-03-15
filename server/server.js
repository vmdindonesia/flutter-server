'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');
var app = module.exports = loopback();
var path = require('path');
var bodyParser = require('body-parser');

// configure view handler
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../common/views'));

// configure body parser
app.use(bodyParser.urlencoded({ extended: true }));

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname);

app.start = function() {
  // start the web server
  var server = app.listen(function() {
    app.emit('started', server);
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
  return server;
};

app.start = function () {
  // start the web server
  return app.listen(function () {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// start the server if `$ node server.js`
if (require.main === module) {
  // app.start();
  app.io = require('socket.io')(app.start());

  app.io.on('connection', function (socket) {
    console.log('socket is connected');

    socket.on('disconnect', function () {
      console.log('socket disconnected');
    });

    // Realtime socket.io
    require('./realtime')(socket);
  });

}