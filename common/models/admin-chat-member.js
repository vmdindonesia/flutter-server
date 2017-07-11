'use strict';

module.exports = function (Adminchatmember) {

    var app = require('../../server/server');

    Adminchatmember.checkRoomMember = checkRoomMember;
    Adminchatmember.addRoomMember = addRoomMember;
    Adminchatmember.getMemberRoom = getMemberRoom;

    function checkRoomMember(chatRoomId, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            adminChatRoomId: chatRoomId,
            memberId: userId
        }

        Adminchatmember.findOne(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            if (result) {
                return cb(null, result);
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

        // FOR ADMIN USING USER ID 0
        // userId = 0;

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

};
