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
            }
        }, function (error, result) {
            if (result.length > 0) {
                console.log(result);
                var targetUserId = result[0].membersId;

                var Pushnotification = require('../push-notification.js');
                var Devicetokenmapping = app.models.Devicetokenmapping;
                var Members = app.models.Members;

                console.log('SEND NOTIF');
                console.log(modelInstance);
                Members.findById(modelInstance.membersId, function (error, result) {
                    if (result) {
                        var userData = result;
                        Devicetokenmapping.getUserToken(targetUserId, function (error, result) {
                            if (result) {
                                var tokens = [];
                                console.log(result);
                                tokens.push(result);
                                var message = {
                                    app_id: '7e0eb180-9d56-4823-8d89-387c06ae97fd',
                                    headings: { en: userData.fullName },
                                    contents: { en: modelInstance.text },
                                    android_group: 'chat',
                                    android_group_message: { en: '$[notif_count] new messages' },
                                    include_player_ids: tokens,
                                    data: {
                                        tag: 'chat'
                                    }
                                };
                                Pushnotification.send(message, 'ZTNlMGFiOGMtZTk2Yy00OTUxLTkyOWUtNTllNmNmZTE3OTRm');
                            }
                            console.log('END SEND NOTIF');
                        })

                    }
                })
            }
            next();
        })

    })

};
