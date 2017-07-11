'use strict';

module.exports = function (Adminchatroom) {

    var app = require('../../server/server');
    var lodash = require('lodash');
    var common = require('../common-util');

    Adminchatroom.remoteMethod('getRoomList', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    })

    Adminchatroom.addRoom = addRoom;
    Adminchatroom.generateRoom = generateRoom;
    Adminchatroom.getRoomList = getRoomList;

    function addRoom(options, cb) {

        var token = options.accessToken;
        var userId = token.userId;

        var dateNow = new Date();

        var newAdminChatRoom = {
            createdAt: dateNow,
            createdBy: userId,
            updatedAt: dateNow,
            updatedBy: userId
        }

        Adminchatroom.create(newAdminChatRoom, function (error, result) {
            if (error) {
                return cb(error);
            }
            return cb(null, result);
        });

    }

    function generateRoom(memberList, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var Adminchatmember = app.models.AdminChatMember;

        var dateNow = new Date();

        Adminchatroom.beginTransaction({ isolationLevel: Adminchatroom.Transaction.READ_COMMITTED }, function (err, tx) {
            var newAdminChatRoom = {
                createdAt: dateNow,
                createdBy: userId,
                updatedAt: dateNow,
                updatedBy: userId
            }

            Adminchatroom.create(newAdminChatRoom, { transaction: tx }, function (error, result) {
                if (error) {
                    return tx.rollback(function (err) {
                        return cb(error);
                    });
                }
                addRoomMember(result.adminChatRoomId, tx);
            });
        });

        function addRoomMember(chatRoomId, tx) {

            var newAdminChatMemberList = [];

            memberList.forEach(function (item) {
                newAdminChatMemberList.push({
                    adminChatRoomId: chatRoomId,
                    memberId: item,
                    createdAt: dateNow,
                    createdBy: userId,
                    updatedAt: dateNow,
                    updatedBy: userId
                });
            }, this);

            Adminchatmember.create(newAdminChatMemberList, { transaction: tx }, function (error, result) {
                if (error) {
                    return tx.rollback(function (err) {
                        return cb(error);
                    })
                }
                return tx.commit(function (err) {
                    return cb(null, chatRoomId);
                });
            });
        }
    }

    function getRoomList(limit, offset, options, cb) {

        var token = options.accessToken;
        var userId = token.userId;

        var Adminchatmember = app.models.AdminChatMember;
        var Adminchatdetail = app.models.AdminChatDetail;

        Adminchatmember.getMemberRoom(options, function (error, result) {
            if (error) {
                return cb(error);
            }
            return getData(result);
        });

        function getData(roomIdList) {
            var filter = {
                where: {
                    adminChatRoomId: { inq: roomIdList }
                },
                include: [
                    {
                        relation: 'adminChatDetails',
                        scope: {
                            limit: 1,
                            order: 'createdAt DESC'
                        }
                    },
                    {
                        relation: 'adminChatMembers',
                        scope: {
                            where: {
                                memberId: { neq: userId }
                            },
                            include: {
                                relation: 'members',
                                scope: {
                                    fields: [
                                        'fullName'
                                    ],
                                    include: [{
                                        relation: 'memberPhotos',
                                        scope: {
                                            fields: ['src']
                                        }
                                    }]
                                }
                            }
                        }
                    }
                ],
                limit: limit,
                skip: offset,
                order: 'lastChat DESC'
            }
            Adminchatroom.find(filter, function (error, result) {
                if (error) {
                    return cb(error);
                }
                var chatRoomData = JSON.parse(JSON.stringify(result))
                lodash.remove(chatRoomData, function (n) {
                    return !(n.adminChatMembers[0].members)
                });
                // chatRoomData.forEach(function (item) {
                //     // var adminChatMembers = item.adminChatMembers[0];
                //     var members = item.adminChatMembers[0].members;
                //     item.fullName = members.fullName;
                //     item.lastMessage = item.adminChatDetails[0].message;
                //     item.avatarImg = members.memberPhotos.src;
                // }, this);

                return common.asyncLoop(chatRoomData.length, function (loop) {
                    var index = loop.iteration();
                    var item = chatRoomData[index];

                    var members = item.adminChatMembers[0].members;
                    item.fullName = members.fullName;
                    item.lastMessage = item.adminChatDetails[0].message;
                    item.avatarImg = members.memberPhotos.src;


                    Adminchatdetail.unreadCount(item.adminChatRoomId, options, function (error, result) {
                        if (error) {
                            return cb(error);
                        }
                        item.unreadCount = result;
                        loop.next();
                    });

                }, function () {
                    return cb(null, chatRoomData);

                })
            });
        }
    }

};
