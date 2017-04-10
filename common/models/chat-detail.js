'use strict';

module.exports = function (Chatdetail) {
    Chatdetail.remoteMethod('createChat', {
        http: { path: '/createChat', verb: 'post' },
        accepts: { arg: 'param', type: 'Object' },
        returns: { arg: 'response', type: 'array', root: true }
    });

    Chatdetail.createChat = function (data, cb) {
        var app = require('../../server/server');
        var memberPhoto = app.models.MemberPhoto;
        var _ = require('lodash');
        var socket = Chatdetail.app.io;

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
                socket.in(data.matchId).emit('chating', result);

                // Result object
                cb(null, result);
            });
        });
    };

    Chatdetail.afterRemote('createChat', function (ctx, modelInstance, next) {
        var app = require('../../server/server');
        var Matchmember = app.models.MatchMember;
        Matchmember.find({
            where: {
                and: [
                    { matchId: modelInstance.matchId },
                    { membersId: { neq: modelInstance.membersId } }
                ]
            },
            include: {
                relation: "members",
                scope: {
                    fields: ['id', 'fullName', 'online'],
                    include: {
                        relation: "memberPhotos"
                    }
                }
            }
        }, function (error, result) {
            if (result.length > 0) {
                console.log(result);
                var targetUserId = result[0].membersId;

                var Pushnotification = require('../push-notification.js');
                console.log(modelInstance.text);
                Pushnotification.chat(modelInstance.membersId, targetUserId, modelInstance.text, result[0]);
            }
            next();
        })

    })

};
