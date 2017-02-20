'use strict';

module.exports = function(Chatdetail) {
    Chatdetail.remoteMethod('createChat', {
        http: { path: '/createChat', verb: 'post' },
        accepts: { arg: 'param', type: 'Object' },
        returns: { arg: 'response', type: 'array',  root: true }
    });

    Chatdetail.createChat = function(data, cb) {
        var app = require('../../server/server');
        var memberPhoto = app.models.MemberPhoto;
        var _ = require('lodash');

        Chatdetail.create(data, function (err, result) {
        	if (err) {
        		cb(err);
        		return;
        	}

            memberPhoto.findOne({
                where: { membersId: result.membersId }
            }, function (err, photo) {
                if (err) {
                    cb(err);
                    return;
                }

                result['src'] = _.isNull(photo) ? null : photo.src;

                // Send with socket
                // Chatdetail.app.mx.IO.emit('chating', result);

                // Result object
                cb(null, result);
            });
        });
    };
};
