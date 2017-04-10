'use strict';

module.exports = function (Likelist) {

    var app = require('../../server/server');

    Likelist.afterRemote('create', function (ctx, modelInstance, next) {
        // console.log(JSON.stringify(modelInstance));
        var app = require('../../server/server');
        var Pushnotification = require('../push-notification.js');

        var Devicetokenmapping = app.models.Devicetokenmapping;
        var Members = app.models.Members;
        // console.log('SEND NOTIF');
        //model instance isi {"id":404,"likeUser":"318767","likeMember":"183836"}
        Members.findById(modelInstance.likeUser, function (error, result) {
            if (result) {
                var userData = result;
                Devicetokenmapping.getUserToken(modelInstance.likeMember, function (error, result) {
                    if (result) {
                        var tokens = [];
                        tokens.push(result);
                        var message = {
                            app_id: '7e0eb180-9d56-4823-8d89-387c06ae97fd',
                            contents: { en: userData.fullName + ' like your profile' },
                            include_player_ids: tokens
                        };
                        Pushnotification.send(message, 'ZTNlMGFiOGMtZTk2Yy00OTUxLTkyOWUtNTllNmNmZTE3OTRm');
                    }
                    // console.log('END SEND NOTIF');
                })

            }
        })
        next();
    });

    Likelist.remoteMethod('doLike', {
        description: 'Add to Like List then check is user match with someone.',
        http: { verb: 'post' },
        accepts: [
            { arg: 'userId', type: 'number', required: true, description: 'Id of user, who current user like' },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'isMatch', type: 'boolean' }
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
                        cb(null, false);
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
                    cb(null, true);
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
