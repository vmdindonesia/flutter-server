'use strict';

module.exports = function (Chatdetail) {

    var app = require('../../server/server');
    var Pushnotification = require('../push-notification');
    var common = require('../common-util.js');
    var filterPrivacy = require('../filter-privacy.js');

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
            { arg: 'type', type: 'string', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Chatdetail.remoteMethod('setRead', {
        http: { verb: 'post' },
        accepts: [
            { arg: 'matchId', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Chatdetail.createChat = createChat;
    Chatdetail.getChatDetail = getChatDetail;
    Chatdetail.sendChat = sendChat;
    Chatdetail.setRead = setRead;

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

        var Matchmember = app.models.MatchMember;

        var filter = {
            where: {
                matchId: matchId,
                membersId: userId
            }
        }

        Matchmember.findOne(filter, function (error, result) {
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
                updateRead(matchId, userId, function () {
                    return cb(null, result);
                });
            });

        }

        function updateRead(matchId, memberId, callback) {
            var Matchmember = app.models.MatchMember;

            var filter = {
                matchId: matchId,
                membersId: { neq: memberId }
            }

            var newValue = {
                isRead: 0
            }
            Matchmember.updateAll(filter, newValue, function (error, result) {
                if (error) {
                    return cb(error);
                }
                callback();
            })
        }

    }

    function sendChat(matchId, message, type, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        // VALIDATE TYPE
        var enumType = [
            'IMAGE',
            'TEXT'
        ];

        if (enumType.indexOf(type) < 0) {
            return cb({
                name: 'chat.type.not.found',
                status: 404,
                message: 'There is no chat type for : ' + type + '. Please use ' + JSON.stringify(enumType)
            });
        }

        Chatdetail.beginTransaction({ isolationLevel: Chatdetail.Transaction.READ_COMMITTED }, function (error, tx) {
            if (error) {
                return cb(error);
            }

            var dateNow = new Date();

            var newChat = {
                matchId: matchId,
                membersId: userId,
                text: decodeURIComponent(message),
                type: type,
                createdDate: dateNow
            }

            Chatdetail.create(newChat, { transaction: tx }, function (error, result) {
                if (error) {
                    return tx.rollback(function (err) {
                        if (err) {
                            return cb(err);
                        }
                        return cb(error);
                    });
                }

                changeRead(matchId, userId, function () {
                    return tx.commit(function (err) {
                        // BUAT BALIKAN SEND CHAT
                        Chatdetail.app.mx.IO.emit('chating:' + result.matchId, result);
                        return cb(null, result);
                    });
                });

                // return cb(null, result);
            });

            function changeRead(matchId, memberId, callback) {

                var Matchmember = app.models.MatchMember;
                var Chat = app.models.Chat;

                var filter = {
                    fields: ['membersId', 'matchId'],
                    where: {
                        and: [
                            { matchId: matchId },
                            { membersId: { neq: memberId } }
                        ]
                    },
                    include: {
                        relation: 'members',
                        scope: {
                            fields: [
                                'id',
                                'fullName',
                                'gender',
                                'about',
                                'employeeType', //occupation
                                'income',
                                'address',
                                'religion',
                                'hobby',
                                'race', //origin
                                'degree',
                                'zodiac',
                                'bday',
                                'online',
                                'alias'
                            ],
                            include: [{
                                relation: 'memberPhotos',
                                scope: {
                                    fields: ['src']
                                }
                            }, {
                                relation: 'memberImage',
                                scope: {
                                    fields: ['src']
                                }
                            }]
                        }
                    }
                }

                Matchmember.findOne(filter, { transaction: tx }, function (error, result) {
                    if (error) {
                        return tx.callback(function (err) {
                            if (err) {
                                return cb(err);
                            }
                            return cb(error);
                        });
                    }
                    if (result) {
                        if ('members' in result) {

                            result = JSON.parse(JSON.stringify(result));

                            var memberData = result.members;
                            if (typeof memberData !== 'undefined') {
                                memberData.hobby = JSON.parse(memberData.hobby);

                                var bdayDate = new Date(memberData.bday);
                                memberData.age = common.calculateAge(bdayDate);

                                memberData.matchId = result.matchId;
                                var memberList = [];
                                memberList.push(memberData);
                                filterPrivacy.apply(userId, memberList, function (error, result) {
                                    if (error) {
                                        return tx.rollback(function (err) {
                                            if (err) {
                                                return cb(err);
                                            }
                                            return cb(error);
                                        });
                                    }
                                    var endResult = result[0];
                                    endResult.chatDetail = [];
                                    updateRead(userId, function () {
                                        console.log(endResult);
                                        Pushnotification.chat(userId, endResult.id, decodeURIComponent(message), endResult);
                                        callback();
                                    });
                                    // Chat.getLatestChat(memberData.matchId, function (result) {
                                    //     endResult.chatDetail = result;
                                    //     updateRead(userId, function () {
                                    //         Pushnotification.chat(userId, endResult.id, decodeURIComponent(message), endResult);
                                    //         callback();
                                    //     });
                                    // });
                                });
                            }
                        }

                    } else {
                        return tx.rollback(function (err) {
                            if (err) {
                                return cb(err);
                            }
                            return cb({
                                name: 'match.member.data.not.found',
                                status: 404,
                                message: 'There is no match member data : ' + matchId
                            });
                        });
                    }
                });

                function updateRead(memberId, callback) {
                    var filter = {
                        matchId: matchId,
                        membersId: memberId
                    }
                    var newValue = {
                        updateBy: userId,
                        isRead: 1
                    }
                    Matchmember.updateAll(filter, newValue, { transaction: tx }, function (error, result) {
                        if (error) {
                            return tx.rollback(function (err) {
                                if (err) {
                                    return cb(err);
                                }
                                return cb(error);
                            });
                        }
                        doUnhide(tx, function () {
                            callback();
                        });
                    });
                }

                function doUnhide(tx, callback) {
                    var Chathide = app.models.ChatHide;

                    Chathide.unhide(userId, matchId, function (error, result) {
                        if (error) {
                            return tx.rollback(function (err) {
                                if (err) {
                                    cb(err);
                                }
                                return cb(error);
                            });
                        }
                        callback();
                    });
                }
            }
        });
    }

    function setRead(matchId, options, cb) {

        var token = options.accessToken;
        var userId = token.userId;

        var where = {
            matchId: matchId,
            membersId: { neq: userId }
        }

        var newValue = {
            read: 1
        }

        Chatdetail.updateAll(where, newValue, function (error, result) {
            if (error) {
                return cb(error);
            }
            return cb(null, result);
        });
    }


};
