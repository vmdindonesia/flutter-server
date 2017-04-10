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
                    Pushnotification.match(newMatchMembers[0].membersId);
                    Pushnotification.match(newMatchMembers[1].membersId);
                    cb(null, true);
                }
            })

        }
    }

    function sendLikeNotif(senderUserId, recipientUserId) {
        var Pushnotification = require('../push-notification.js');

        var Members = app.models.Members;
        Members.findById(modelInstance.likeUser, function (error, result) {
            if (result) {
                var userData = result;
                var message = {
                    app_id: '7e0eb180-9d56-4823-8d89-387c06ae97fd',
                    android_group: 'likes',
                    android_group_message: {
                        en: '$[notif_count] people like your profile',
                        id: '$[notif_count] orang menyukai profile anda'
                    },
                    contents:
                    {
                        en: userData.fullName + ' like your profile',
                        id: userData.fullName + ' menyukai profil anda'
                    },
                    filters: [
                        { field: 'tag', key: 'userId', relation: '=', value: modelInstance.likeMember }
                    ]
                };
                Pushnotification.send(message, 'ZTNlMGFiOGMtZTk2Yy00OTUxLTkyOWUtNTllNmNmZTE3OTRm');
            }
        })
    }

};
