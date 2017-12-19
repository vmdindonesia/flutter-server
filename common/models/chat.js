'use strict';

module.exports = function (Chat) {

    var app = require('../../server/server');
    var lodash = require('lodash');
    var common = require('../common-util');
    var filterPrivacy = require('../filter-privacy');

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
            Matchmember.getMatchMemberIdList(userId, true, function (error, result) {
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

        function getHideList(callback) {
            var Chathide = app.models.ChatHide;

            Chathide.getHideList(options, function (error, result) {
                if (error) {
                    return cb(error);
                }

                callback(result);
            })
        }

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
        // createMatch(likeMember, options)
        //     .then(function (result) {
        //         resultChat(likeMember, result[0].matchId, cb)
        //     })
        //     .catch(function (error) {
        //         cb(error);
        //     });

        resultChat(likeMember, 755, cb)
    }

    async function createMatch(likeMember, options) {
        var token = options.accessToken;
        var currentUserId = token.userId;

        var like = [{
            likeUser: currentUserId,
            likeMember: likeMember,
            createdAt: new Date(),
            createdBy: currentUserId,
            updatedAt: new Date(),
            updatedBy: currentUserId,
        }, {
            likeUser: likeMember,
            likeMember: currentUserId,
            createdAt: new Date(),
            createdBy: currentUserId,
            updatedAt: new Date(),
            updatedBy: currentUserId
        }];

        var newMatches = {
            title: 'chat',
            createdAt: new Date(),
            createdBy: currentUserId,
            updatedAt: new Date(),
            updatedBy: likeMember
        };

        return new Promise(async function (resolve, reject) {
            try {
                await app.dataSources.pmjakarta.transaction(async models => {
                    const { LikeList, Matches, MatchMember } = models;

                    const createLike = await LikeList.create(like);
                    const createMatch = await Matches.create(newMatches);

                    const newMatchMember = [{
                        matchId: createMatch.id,
                        matchFromHome: 1,
                        membersId: currentUserId,
                        updateBy: currentUserId,
                        updateDate: new Date()
                    }, {
                        matchId: createMatch.id,
                        matchFromHome: 1,
                        membersId: likeMember,
                        updateBy: currentUserId,
                        updateDate: new Date()
                    }];

                    const createMatchMember = await MatchMember.create(newMatchMember);

                    resolve(createMatchMember);
                });
                // resolve([
                //     { matchId: 709 }
                // ]);
            } catch (error) {
                reject(error);
            }
        });
    }

    function resultChat(likeMember, matchId, cb) {
        const Matchmember = app.models.MatchMember;

        const filter = {
            where: {
                and: [
                    { membersId: likeMember },
                    { matchId: matchId }
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
                        'employeeType',
                        'income',
                        'address',
                        'religion',
                        'hobby',
                        'race',
                        'degree',
                        'zodiac',
                        'bday',
                        'online',
                        'alias',
                        'updatedAt'
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
        };

        Matchmember.findOne(filter, function (error, result) {
            if (error) {
                return cb(error);
            }

            result = JSON.parse(JSON.stringify(result));

            // Apply filter privacy
            var newList = [];
            newList.push(result.members);

            // Recreate data
            var tempResult = {};
            tempResult['isMatch'] = true;

            filterPrivacy.apply(result.members.id, newList, function (err, res) {
                if (error) {
                    console.log(err);

                    tempResult['matchMember'] = result.members;
                    tempResult['matchMember']['matchId'] = matchId;
                    tempResult['matchMember']['chatDetail'] = [];
                } else {
                    tempResult['matchMember'] = res[0];
                    tempResult['matchMember']['matchId'] = matchId;
                    tempResult['matchMember']['chatDetail'] = [];
                }

                cb(null, tempResult);
            });

        });
    }
};
