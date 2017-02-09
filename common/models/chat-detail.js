'use strict';

module.exports = function(Chatdetail) {
    Chatdetail.remoteMethod('createChat', {
        http: { path: '/createChat', verb: 'post' },
        accepts: { arg: 'param', type: 'Object' },
        returns: { arg: 'response', type: 'array',  root: true }
    });

    Chatdetail.createChat = function(data, cb) {
    	var socket = Chatdetail.app.io;

        Chatdetail.create(data, function (err, result) {
        	if (err) {
        		cb(err);
        		return;
        	}

            socket.emit('chating', result);
        	cb(null, result);
        });
    };
};
