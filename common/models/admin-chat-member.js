'use strict';

module.exports = function (Adminchatmember) {

    var app = require('../../server/server');

    Adminchatmember.remoteMethod('getChatRoomId', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'memberId', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    })

    Adminchatmember.checkRoomMember = checkRoomMember;
    Adminchatmember.addRoomMember = addRoomMember;
    Adminchatmember.getMemberRoom = getMemberRoom;
    Adminchatmember.getChatRoomId = getChatRoomId;

    function checkRoomMember(chatRoomId, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            where: {
                adminChatRoomId: chatRoomId,
                memberId: userId
            }
        };

        Adminchatmember.findOne(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            if (result) {
                filter = {
                    where: {
                        adminChatRoomId: chatRoomId,
                        memberId: { neq: userId }
                    }
                }
                return Adminchatmember.find(filter, function (error, result) {
                    if (error) {
                        return cb(error);
                    }
                    var memberIdList = [];
                    result.forEach(function(item) {
                        memberIdList.push(item.memberId);
                    }, this);
                    // RETURN ARRAY ISINYA ID DARI USER YANG ADA DI ROOM TSB
                    return cb(null, memberIdList);
                });
            } else {
                return cb({
                    name: 'chat.room.not.authorized',
                    status: 404,
                    message: 'You dont have authorization for chat room id : ' + chatRoomId
                });
            }
        })

    }

    function addRoomMember(chatRoomId, memberList, options, cb) {

        var token = options.accessToken;
        var userId = token.userId;

        var dateNow = new Date();

        var newAdminChatMemberList = []

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

        Adminchatmember.create(newAdminChatMemberList, function (error, result) {
            if (error) {
                return cb(error);
            }
            return cb(null, result);
        });

    }

    function getMemberRoom(options, cb) {

        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            where: {
                memberId: userId
            }
        }

        Adminchatmember.find(filter, function (error, result) {

            if (error) {
                return cb(error);
            }
            var roomIdList = [];

            result.forEach(function (item) {
                roomIdList.push(item.adminChatRoomId);
            }, this);

            return cb(null, roomIdList);

        });
    }

    function getChatRoomId(memberId, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            where: {
                memberId: memberId
            }
        }

        Adminchatmember.findOne(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            if (result) {
                var chatRoomId = result.adminChatRoomId;
                return cb(null, chatRoomId);
            } else {
                return cb({
                    name: 'chat.room.not.found',
                    status: 404,
                    message: 'You dont have chat room for user  : ' + memberId
                });
            }


        })
    }

};
