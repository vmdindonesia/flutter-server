'use strict';

module.exports = function (Likelist) {

    var app = require('../../server/server');
    var Pushnotification = require('../push-notification.js');

    Likelist.afterRemote('create', function (ctx, modelInstance, next) {
        Pushnotification.like(modelInstance.likeUser, modelInstance.likeMember);
        next();
    });

    Likelist.remoteMethod('doLike', {
        description: 'Add to Like List then check is user match with someone.',
        http: { verb: 'post' },
        accepts: [
            { arg: 'userId', type: 'number', required: true, description: 'Id of user, who current user like' },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: [
            { arg: 'isMatch', type: 'boolean' },
            { arg: 'matchMember', type: 'object' }
        ]
    })

    Likelist.doLike = function (userId, options, cb) {

        var token = options.accessToken;
        var currentUserId = token.userId;
        var likedUserId = userId;
        var dateNow = new Date();

        addLike(checkMatch);

        // FUNCTION 1
        function addLike(callback) {
            // console.log('ADDING LIKE');
            var newLike = {
                likeUser: currentUserId,
                likeMember: likedUserId
            };
            Likelist.create(newLike, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    Pushnotification.like(currentUserId, likedUserId);
                    callback(addMatches);
                }
            });
        }

        // FUNCTION 2
        function checkMatch(callback) {
            // console.log('CHECKING MATCH');
            var filter = {
                where: {
                    and: [
                        { likeUser: likedUserId },
                        { likeMember: currentUserId }
                    ]
                }
            };
            Likelist.findOne(filter, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    if (result) {
                        callback(addMatchMember);
                    } else {
                        cb(null, false, {});
                    }
                }
            });
        }


        // FUNCTION 3
        function addMatches(callback) {
            // console.log('ADD MATCHES');
            var Matches = app.models.Matches;

            var newMatches = {
                title: 'chat',
                createAt: dateNow
            };
            Matches.create(newMatches, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    callback(result.id);
                }
            });
        }

        // FUNCTION 4
        function addMatchMember(matchId) {
            // console.log('ADD MATCH MEMBER');

            var Matchmember = app.models.MatchMember;
            var newMatchMembers = [];

            newMatchMembers.push({
                matchId: matchId,
                membersId: currentUserId,
                createdDate: dateNow
            });

            newMatchMembers.push({
                matchId: matchId,
                membersId: likedUserId,
                createdDate: dateNow
            });

            Matchmember.create(newMatchMembers, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    Pushnotification.match(newMatchMembers[0].membersId);
                    Pushnotification.match(newMatchMembers[1].membersId);
                    Matchmember.findOne({
                        where: {
                            and: [
                                { membersId: likedUserId },
                                { matchId: matchId }
                            ]
                        },
                        include: {
                            relation: 'members',
                            scope: {
                                fields: ['id', 'fullName', 'online'],
                                include: {
                                    relation: 'memberPhotos'
                                }
                            }
                        }
                    }, function (error, result) {
                        if (error) {
                            cb(error);
                        } else {
                            cb(null, true, result);
                        }
                    })
                }
            })

        }
    }

    Likelist.remoteMethod('getLikeMeList', {
        description: 'Get like me list',
        http: { verb: 'get' },
        accepts: { arg: 'options', type: 'object', http: 'optionsFromRequest' },
        returns: { arg: 'result', type: 'array', root: true }
    })

    Likelist.getLikeMeList = function (options, cb) {
        var common = require('../common-util.js');

        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            fields: ['likeUser'],
            where: { likeMember: userId },
            include: {
                relation: 'userLike',
                scope: {
                    fields: [
                        'id',
                        'fullName',
                        'online',
                        'employeeType',
                        'zodiac',
                        'religion',
                        'address',
                        'bday'
                    ],
                    include: 'memberPhotos'
                }
            }
        };

        Likelist.find(filter, function (error, result) {
            if (error) {
                cb(error);
            } else {
                var likeMeList = result;

                common.asyncLoop(likeMeList.length, function (loop) {
                    var index = loop.iteration();
                    var item = likeMeList[index];

                    getLikeStatus(userId, item.likeUser, function (error, result) {
                        if (error) {
                            cb(error);
                        } else {
                            item['isLiked'] = result;

                            getDislikeStatus(userId, item.likeUser, function (error, result) {
                                if (error) {
                                    cb(error);
                                } else {
                                    item['isDisliked'] = result;
                                    loop.next();
                                }
                            });
                        }
                    });
                }, function () {
                    cb(null, likeMeList);
                });
            }
        });

        function getLikeStatus(myUserId, targetUserId, callback) {

            var filter = {
                where: {
                    likeUser: myUserId,
                    likeMember: targetUserId
                }
            };
            Likelist.findOne(filter, function (error, result) {
                if (error) {
                    callback(error);
                } else {
                    if (result) {
                        callback(null, true);
                    } else {
                        callback(null, false);
                    }
                }
            });
        }

        function getDislikeStatus(myUserId, targetUserId, callback) {
            var Dislikelist = app.models.DislikeList;

            var filter = {
                where: {
                    dislikeUser: myUserId,
                    dislikeMamber: targetUserId
                }
            };
            Dislikelist.findOne(filter, function (error, result) {
                if (error) {
                    callback(error);
                } else {
                    if (result) {
                        callback(null, true);
                    } else {
                        callback(null, false);
                    }
                }
            })

        }

    }
};
