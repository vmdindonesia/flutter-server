'use strict';

module.exports = function (Adminchatdetail) {

    var app = require('../../server/server');

    Adminchatdetail.remoteMethod('sendChat', {
        http: { verb: 'post' },
        accepts: [
            { arg: 'recipientId', type: 'number' },
            { arg: 'chatRoomId', type: 'number' },
            { arg: 'chatType', type: 'string', required: true },
            { arg: 'chatContent', type: 'string', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Adminchatdetail.remoteMethod('getDetail', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'chatRoomId', type: 'number', required: true },
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Adminchatdetail.sendChat = sendChat;
    Adminchatdetail.getDetail = getDetail;
    Adminchatdetail.unreadCount = unreadCount;

    function sendChat(recipientId, chatRoomId, chatType, chatContent, options, cb) {

        var token = options.accessToken;
        var userId = token.userId;

        var dateNow = new Date();

        var Adminchatmember = app.models.AdminChatMember;
        var Adminchatroom = app.models.AdminChatRoom;

        if (chatRoomId) {
            Adminchatmember.checkRoomMember(chatRoomId, options, function (error, result) {
                if (error) {
                    return cb(error);
                }
                return addChat();
            });
        } else {
            // FOR ADMIN ROOM ONLY GENERATED FOR ADMIN (ID : 0) AND 
            // IF FROM MOBILE THEN RECIPIENT IS 0
            // IF FROM ADMIN THEN USER ID = 0
            Adminchatroom.generateRoom([recipientId, userId], options, function (error, result) {
                if (error) {
                    return cb(error);
                }
                chatRoomId = result;
                return addChat();
            });
        }

        function addChat() {
            Adminchatdetail.beginTransaction({ isolationLevel: Adminchatdetail.Transaction.READ_COMMITTED }, function (err, tx) {
                var newAdminChatDetail = {
                    adminChatRoomId: chatRoomId,
                    senderId: userId,
                    type: chatType,
                    message: chatContent,
                    createdAt: dateNow,
                    createdBy: userId,
                    updatedAt: dateNow,
                    updatedBy: userId
                }

                Adminchatdetail.create(newAdminChatDetail, { transaction: tx }, function (error, result) {
                    if (error) {
                        return tx.rollback(function (err) {
                            return cb(error);
                        });
                    }
                    return updateRoom(result, tx, function () {
                        return tx.commit(function (err) {
                            return cb(null, result);
                        });
                    });
                });

            });

            function updateRoom(AdminChatDetail, tx, callback) {

                var attributes = {
                    lastChat: AdminChatDetail.createdAt,
                    updatedAt: dateNow,
                    updatedBy: userId
                }

                var where = {
                    adminChatRoomId: AdminChatDetail.adminChatRoomId
                }

                Adminchatroom.updateAll(where, attributes, { transaction: tx }, function (error, result) {
                    if (error) {
                        return tx.rollback(function (err) {
                            return cb(error);
                        })
                    }
                    return callback();
                });
            }
        }
    }

    function getDetail(chatRoomId, limit, offset, options, cb) {
        var Adminchatmember = app.models.AdminChatMember;

        Adminchatmember.checkRoomMember(chatRoomId, options, function (error, result) {
            if (error) {
                return cb(error);
            }
            getChatDetail();
        });

        function getChatDetail() {
            var filter = {
                where: {
                    adminChatRoomId: chatRoomId
                }
            }

            Adminchatdetail.find(filter, function (error, result) {
                if (error) {
                    return cb(error);
                }
                return cb(null, result);
            });
        }

    }

    function unreadCount(chatRoomId, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var where = {
            adminChatRoomId: chatRoomId,
            senderId: { neq: userId },
            readStatus: 0,
        }

        Adminchatdetail.count(where, function (error, result) {
            if (error) {
                return cb(error);
            }
            return cb(null, result);
        });

    }

};
