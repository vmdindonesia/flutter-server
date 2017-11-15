'use strict';

module.exports = function (Matchmember) {
    var app = require('../../server/server');
    var common = require('../common-util.js');
    var filterPrivacy = require('../filter-privacy.js');
    let async = require("async");

    Matchmember.remoteMethod('getMatchList', {
        description: 'Get List of Match with given User Id',
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'array', root: true, description: 'Array Of Object' }
    });

    Matchmember.getMatchList = getMatchList;
    Matchmember.getMatchMemberIdList = getMatchMemberIdList;
    Matchmember.getMemberIdMatchList = getMemberIdMatchList;
    Matchmember.isUserMatch = isUserMatch;


    function getMatchList(limit, offset, options, cb) {

        var token = options.accessToken;
        var userId = token.userId;

        var Memberverifystatus = app.models.MemberVerifyStatus;

        var excludeBlockList = [];

        excludeBlock(function () {
            getMatchMemberIdList(userId, false, function (error, result) {
                if (error) {
                    cb(error);
                }
                var filter = {
                    where: {
                        and: [
                            { id: { inq: result } },
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
                    },
                    limit: limit,
                    skip: offset,
                    order: 'id DESC'
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

                                // memberData.matchId = item.matchId;
                                memberData.matchMember = JSON.parse(JSON.stringify(item));

                                matchList.push(memberData);

                            }
                        }
                    }, this);

                    common.asyncLoop(matchList.length, function (loop) {
                        var index = loop.iteration();
                        var item = matchList[index];

                        Memberverifystatus.getVerifyScoreByUserId(item.id, function (error, status, result) {
                            item.verify = result;
                            return loop.next();
                        });

                    }, function () {
                        filterPrivacy.apply(userId, matchList, function (error, result) {
                            if (error) {
                                cb(error);
                            }
                            return cb(null, result);
                        });

                    });

                    // cb(null, matchList);
                })

            });
        });

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


    }

    function getMatchMemberIdList(userId, matchFromHome, cb) {

        var filter = {
            fields: ['matchId'],
            where: {
                and: [
                    { membersId: userId }
                ]
            }
        }

        if (!matchFromHome) {
            filter.where.and.push({ matchFromHome: false })
        }

        Matchmember.find(filter, function (error, result) {
            if (error) {
                cb(error);
            }

            var matchIdList = [];
            result.forEach(function (item) {
                matchIdList.push(item.matchId);
            }, this);

            getResult(matchIdList);
        });

        function getResult(matchIdList) {

            var filter = {
                fields: ['id'],
                where: {
                    and: [
                        { matchId: { inq: matchIdList } },
                        { membersId: { neq: userId } }
                    ]
                }
            }

            Matchmember.find(filter, function (error, result) {
                if (error) {
                    cb(error);
                }

                var matchMemberIdList = [];
                result.forEach(function (item) {
                    matchMemberIdList.push(item.id);
                }, this);
                cb(null, matchMemberIdList);
            });

        }
    }

    function getMemberIdMatchList(userId, cb) {

        getMatchMemberIdList(userId, false, function (error, result) {
            if (error) {
                cb(error);
            }
            var filter = {
                fields: ['membersId'],
                where: {
                    id: { inq: result }
                }
            }
            Matchmember.find(filter, function (error, result) {
                if (error) {
                    cb(error);
                }
                var memberIdMatchList = [];
                result.forEach(function (item) {
                    memberIdMatchList.push(item.membersId);
                }, this);
                cb(null, memberIdMatchList);
            })

        })

    }

    function isUserMatch(userId1, userId2, cb) {
        getMemberIdMatchList(userId1, function (error, result) {
            if (error) {
                cb(error);
            }
            if (result.indexOf(userId2) === -1) {
                cb(null, false);
            } else {
                cb(null, true);
            }
        })

    }

};
