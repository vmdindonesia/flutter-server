'use strict';

module.exports = function (Engageview) {

    var app = require('../../server/server');

    Engageview.remoteMethod('getUser', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Engageview.remoteMethod('getRegisteredUser', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'userId', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Engageview.remoteMethod('getUnrespondedChat', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'userId', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Engageview.remoteMethod('getUnrespondedLike', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'userId', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Engageview.remoteMethod('getUnrespondedMatch', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'userId', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Engageview.getUser = getUser;
    Engageview.getRegisteredUser = getRegisteredUser;
    Engageview.getUnrespondedChat = getUnrespondedChat;
    Engageview.getUnrespondedLike = getUnrespondedLike;
    Engageview.getUnrespondedMatch = getUnrespondedMatch;

    function getUser(options, cb) {
        var token = options.accessToken;
        var userId = token.userId;


        var filter = {
            include: [
                {
                    relation: 'members',
                    scope: {
                        fields: ['id', 'fullName', 'email', 'gender', 'phone']
                    }
                }
            ],
            order: 'lastOnline DESC'
        };

        return Engageview.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            return cb(null, result);
        });

    }

    function getRegisteredUser(userId, options, cb) {
        var Members = app.models.Members;
        var Viewhome = app.models.ViewHome;

        var filter = {
            fields: ['lastOnline']
        };

        return Members.findById(userId, filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            filter = {
                fields: ['id'],
                where: {
                    createdAt: { gte: result.lastOnline }
                }
            };
            var where = {
                verifyScore: { gte: 40 },
                createdAt: { gte: result.lastOnline }
            }
            return Viewhome.count(where, function (error, result) {
                if (error) {
                    return cb(error);
                }

                return cb(null, result);
            });
        });

    }

    function getUnrespondedChat(userId, options, cb) {

        return getMatchIdList(userId, function (error, result) {
            if (error) {
                return cb(error);
            }

            var Matchmember = app.models.MatchMember;
            var filter = {
                fields: ['membersId', 'isRead'],
                where: {
                    matchId: { inq: result },
                    membersId: userId,
                    isRead: 1
                },
                include: [
                    { relation: 'members' }
                ]
            }

            return Matchmember.find(filter, function (error, result) {
                if (error) {
                    return cb(error);
                }
                var tempList = [];
                result.forEach(function (item) {
                    if ('members' in item) {
                        tempList.push(item);
                    }
                }, this);
                return cb(null, tempList.length);
            });

        })


        function getMatchIdList(userId, callback) {
            var Matchmember = app.models.MatchMember;
            var filter = {
                fields: ['matchId'],
                where: {
                    membersId: userId
                }
            }

            return Matchmember.find(filter, function (error, result) {
                if (error) {
                    return callback(error);
                }
                var matchIdList = []
                result.forEach(function (item) {
                    matchIdList.push(item.matchId);
                }, this);
                return callback(null, matchIdList);
            });
        }
    }

    function getUnrespondedLike(userId, options, cb) {
        var Matchmember = app.models.MatchMember;
        var Dislikelist = app.models.DislikeList;
        var Likelist = app.models.LikeList;

        var matchUserIdList = [];
        var dislikeUserIdList = [];

        return getDislikeUserIdList(function (result) {
            dislikeUserIdList = result;
            return getMatchUserIdList(function (result) {
                matchUserIdList = result;
                return finalResult();
            });
        });

        function finalResult() {

            var where = {
                and: [
                    { likeMember: userId },
                    { likeUser: { nin: dislikeUserIdList } },
                    { likeUser: { nin: matchUserIdList } }
                ]
            }

            return Likelist.count(where, function (error, result) {
                if (error) {
                    return cb(error);
                }
                return cb(null, result);

            });

        }

        function getDislikeUserIdList(callback) {
            var filter = {
                fields: ['dislikeMamber'],
                where: {
                    dislikeUser: userId
                }
            }
            return Dislikelist.find(filter, function (error, result) {
                if (error) {
                    return cb(error);
                }
                var dislikeMemberIdList = [];
                result.forEach(function (item) {
                    dislikeMemberIdList.push(item.dislikeMamber);
                }, this);

                return callback(dislikeMemberIdList);
            });
        }

        function getMatchUserIdList(callback) {
            return Matchmember.getMemberIdMatchList(userId, function (error, result) {
                if (error) {
                    return cb(error);
                }
                return callback(result);
            });
        }

    }

    function getUnrespondedMatch(userId, options, cb) {
        var Matchmember = app.models.MatchMember;

        var where = {
            membersId: userId,
            updateDate: null
        };

        return Matchmember.count(where, function (error, result) {
            if (error) {
                return cb(error);
            }

            return cb(null, result);
        });

    }

};
