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

    Chat.getChatRoomList = getChatRoomList;
    Chat.getLatestChat = getLatestChat;

    function getChatRoomList(limit, offset, options, cb) {

        var Matchmember = app.models.MatchMember;

        var token = options.accessToken;
        var userId = token.userId;

        getHideList(function (result) {
            getMatchList(result);
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
                            { id: { nin: hideList } }
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
                                'online'
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

                getLatestChat(item.matchId, function (result) {
                    item.chatDetail = result;
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

                var filter = {
                    where: {
                        matchId: item.matchId
                    }
                }
                console.log(filter);
                Chatdetail.find(filter, function (error, result) {
                    if (error) {
                        return cb(error);
                    }
                    item.countChat = result.length;
                    console.log(result);
                    loop.next();
                });

            }, function () {
                return cb(null, chatRoomList);
            });
        }



    }

    function getLatestChat(matchId, callback) {
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
            callback(result);
        })

    }

};
