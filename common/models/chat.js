'use strict';

module.exports = function (Chat) {

    var app = require('../../server/server');
    var lodash = require('lodash');
    var common = require('../common-util');
    var filterPrivacy = require('../filter-privacy');
    var likeTx;

    Chat.remoteMethod('getChatRoomList', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Chat.remoteMethod('chatFromHome', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'likeMember', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Chat.getChatRoomList = getChatRoomList;
    Chat.getLatestChat = getLatestChat;
    Chat.chatFromHome = chatFromHome;

    function getChatRoomList(limit, offset, options, cb) {

        var Matchmember = app.models.MatchMember;

        var token = options.accessToken;
        var userId = token.userId;

        var excludeBlockList = [];

        getHideList(function (result) {
            excludeBlock(function () {
                getMatchList(result);
            })
        });

        function getMatchList(hideList) {
            Matchmember.getMatchMemberIdList(userId, function (error, result) {
                if (error) {
                    return cb(error);
                }
                var filter = {
                    where: {
                        and: [
                            { id: { inq: result } },
                            { matchId: { nin: hideList } },
                            { membersId: { nin: excludeBlockList } }
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
                    },
                    limit: limit,
                    skip: offset,
                    order: 'updateDate DESC'
                }

                Matchmember.find(filter, function (error, result) {
                    if (error) {
                        cb(error);
                    }
                    var matchList = [];

                    result.forEach(function (item) {

                        if ('members' in item) {

                            item = JSON.parse(JSON.stringify(item));

                            var memberData = item.members;
                            if (typeof memberData !== 'undefined') {
                                memberData.hobby = JSON.parse(memberData.hobby);

                                var bdayDate = new Date(memberData.bday);
                                memberData.age = common.calculateAge(bdayDate);

                                memberData.matchId = item.matchId;
                                memberData.isRead = item.isRead;
                                matchList.push(memberData);
                            }
                        }
                    }, this);

                    filterPrivacy.apply(userId, matchList, function (error, result) {
                        if (error) {
                            cb(error);
                        }
                        // cb(null, result);
                        getChatDetail(result);
                    });
                    // cb(null, matchList);
                });

            });
        }

        function excludeBlock(callback) {
            var Block = app.models.Block;
            Block.getExcludeBlock(options, function (error, result) {
                if (error) {
                    return cb(error);
                }
                excludeBlockList = result;
                return callback();
            });

        }


        // Matchmember.getMatchList(limit, offset, options, function (error, result) {
        //     if (error) {
        //         return cb(error);
        //     }
        //     getHideList(function (hideList) {
        //         lodash.remove(result, function (n) {
        //             return hideList.indexOf(n.matchId) != -1;
        //         });
        //         var rearrangeResult = [];
        //         result.forEach(function (item) {
        //             rearrangeResult.push(arrangeStructure(item));
        //         }, this);

        //         getChatDetail(rearrangeResult);
        //         // return cb(null, result);
        //     });
        // });

        function getHideList(callback) {
            var Chathide = app.models.ChatHide;

            Chathide.getHideList(options, function (error, result) {
                if (error) {
                    return cb(error);
                }

                callback(result);
            })
        }

        // function arrangeStructure(item) {
        //     var newItem = JSON.parse(JSON.stringify(item));
        //     delete newItem['matchMember'];
        //     return newItem;
        // }

        function getChatDetail(chatRoomList) {
            common.asyncLoop(chatRoomList.length, function (loop) {
                var index = loop.iteration();
                var item = chatRoomList[index];

                getLatestChat(item.matchId, function (error, result) {
                    if (error) {
                        return cb(error);
                    }
                    item.chatDetail = result;
                    if (result[0]) {
                        item.lastChatTime = result[0].createdDate;
                    } else {
                        item.lastChatTime = new Date(0);
                    }
                    loop.next();
                });

            }, function () {
                countChat(chatRoomList);
                // return cb(null, chatRoomList);
            })
        }

        function countChat(chatRoomList) {
            common.asyncLoop(chatRoomList.length, function (loop) {

                var index = loop.iteration();
                var item = chatRoomList[index];

                var Chatdetail = app.models.ChatDetail;

                var where = {
                    matchId: item.matchId,
                    membersId: { neq: userId },
                    read: 0
                }

                Chatdetail.count(where, function (error, result) {
                    if (error) {
                        return cb(error);
                    }
                    item.countChat = result;
                    // console.log(result);
                    loop.next();
                });

            }, function () {
                var sortedList = lodash.sortBy(chatRoomList, ['lastChatTime']);
                lodash.reverse(sortedList);
                // return cb(null, chatRoomList);
                return cb(null, sortedList);
            });
        }

    }

    function getLatestChat(matchId, cb) {
        var Chatdetail = app.models.ChatDetail;

        var filter = {
            where: {
                matchId: matchId
            },
            limit: 20,
            order: 'createdDate DESC'
        }
        Chatdetail.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            return cb(null, result);
        })

    }

    function chatFromHome(likeMember, options, cb) {
        var token = options.accessToken;
        var currentUserId = token.userId;

        var data = {
            likeUser: currentUserId,
            likeMember: likeMember
        };

        createLikeUser(data, cb);
    }

    function createLikeUser(data, cb) {
        var Likelist = app.models.LikeList;

        var like = {
            likeUser: data.likeUser,
            likeMember: data.likeMember,
            createdAt: new Date(),
            createdBy: data.likeUser,
            updatedAt: new Date(),
            updatedBy: data.likeUser
        }

        Likelist.beginTransaction({ isolationLevel: Likelist.Transaction.READ_COMMITTED }, function (err, tx) {
            likeTx = tx;

            Likelist.create(like, { transaction: likeTx }, function (error, result) {
                if (error) {
                    likeTx.rollback(function (err) {
                        if (err) {
                            return cb(err);
                        }

                        return cb(error);
                    });
                }

                createLikeMember(data, cb);
            });
        });
    }

    function createLikeMember(data, cb) {
        var Likelist = app.models.LikeList;

        var like = {
            likeUser: data.likeMember,
            likeMember: data.likeUser,
            createdAt: new Date(),
            createdBy: data.likeUser,
            updatedAt: new Date(),
            updatedBy: data.likeUser
        }

        Likelist.create(like, { transaction: likeTx }, function (error, result) {
            if (error) {
                likeTx.rollback(function (err) {
                    if (err) {
                        return cb(err);
                    }

                    return cb(error);
                });
            }

            likeTx.commit(function (err) {
                if (err) {
                    return cb(err);
                }

                cb(null, result);
            });
        });
    }
};
