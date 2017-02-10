'use strict';

module.exports = function(Chatdetail) {
    Chatdetail.remoteMethod('createChat', {
        http: { path: '/createChat', verb: 'post' },
        accepts: { arg: 'param', type: 'Object' },
        returns: { arg: 'response', type: 'array',  root: true }
    });

    Chatdetail.createChat = function(data, cb) {
        Chatdetail.create(data, function (err, result) {
        	if (err) {
        		cb(err);
        		return;
        	}

        	cb(null, result);
        });
    };

    Chatdetail.observe('after save', (ctx, next) => {
        console.log(123);
        Chatdetail.app.mx.IO.emit('chating', ctx.instance);
        next();
    });
};
