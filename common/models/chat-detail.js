'use strict';

module.exports = function (Chatdetail) {
    Chatdetail.remoteMethod('createChat', {
        http: { path: '/createChat', verb: 'post' },
        accepts: { arg: 'param', type: 'Object' },
        returns: { arg: 'response', type: 'array', root: true }
    });

    Chatdetail.remoteMethod('getChatDetail', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'matchId', type: 'number', required: true },
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Chatdetail.remoteMethod('sendChat', {
        http: { verb: 'post' },
        accepts: [
            { arg: 'matchId', type: 'number', required: true },
            { arg: 'message', type: 'string', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    })

    Chatdetail.createChat = createChat;
    Chatdetail.getChatDetail = getChatDetail;
    Chatdetail.sendChat = sendChat;

    function createChat(data, cb) {
        var app = require('../../server/server');
        var memberPhoto = app.models.MemberPhoto;
        var _ = require('lodash');
        var socket = Chatdetail.app.io;
        var dateNow = new Date();
        data.createdDate = dateNow;

        data.text = decodeURIComponent(data.text);

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
                // console.log(result);
                var targetUserId = result[0].membersId;

                Matchmember.updateAll({
                    matchId: modelInstance.matchId,
                    membersId: modelInstance.membersId
                }, {
                        updateBy: modelInstance.membersId,
                        isRead: 1
                    }, function (error, ress) {

                    })

                var Pushnotification = require('../push-notification.js');
                // console.log(modelInstance.text);
                Pushnotification.chat(modelInstance.membersId, targetUserId, modelInstance.text, result[0]);
            }
            next();
        })

    });

    Chatdetail.afterRemote('find', function (ctx, modelInstance, next) {
        var app = require('../../server/server');
        var Matchmember = app.models.MatchMember;
        try {
            Matchmember.updateAll({
                matchId: modelInstance.matchId,
                membersId: modelInstance.membersId
            }, {
                    isRead: 0
                }, function (error, ress) {

                })
        } catch (error) {

        }
        next();
    });

    function getChatDetail(matchId, limit, offset, options, cb) {

        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            where: {
                matchId: matchId,
                membersId: userId
            }
        }
        Chatdetail.findOne(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            if (result) {
                getDetail();
            } else {
                return cb({
                    name: 'match.id.not.authorized',
                    status: 404,
                    message: 'You dont have authorization for match id : ' + matchId
                });
            }
        });

        function getDetail() {
            var filter = {
                where: {
                    matchId: matchId
                },
                limit: limit,
                offset: offset,
                order: 'createdDate DESC'
            }
            Chatdetail.find(filter, function (error, result) {
                if (error) {
                    return cb(error);
                }
                return cb(null, result);
            });

        }

    }

    function sendChat(matchId, message, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var dateNow = new Date();

        var newChat = {
            matchId: matchId,
            membersId: userId,
            text: decodeURIComponent(message),
            createdDate: dateNow
        }

        Chatdetail.create(newChat, function (error, result) {
            if (error) {
                return cb(error);
            }

            return cb(null, result);
        });

    }
};
