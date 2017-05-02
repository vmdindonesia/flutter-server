'use strict';

module.exports = function (Likelist) {

    var app = require('../../server/server');
    var Pushnotification = require('../push-notification.js');
    var filterPrivacy = require('../filter-privacy.js');
    let async = require("async");
    var common = require('../common-util.js');


    // BEGIN - BEFORE REMOTE =====================================================================

    // END - BEFORE REMOTE =======================================================================

    // BEGIN - AFTER REMOTE ======================================================================

    Likelist.afterRemote('create', function (ctx, modelInstance, next) {
        Pushnotification.like(modelInstance.likeUser, modelInstance.likeMember);
        next();
    });

    Likelist.afterRemote('find', function (context, remoteMethodOutput, next) {

        // common.privacySettings('','');

        var memberData = {};
        var token = context.args.options.accessToken;
        var userId = token.userId;

        memberData['id'] = userId;

        getCurrentUserVerifyScore();

        function getCurrentUserVerifyScore() {

            var Memberverifystatus = app.models.MemberVerifyStatus;

            Memberverifystatus.getVerifyScoreByUserId(userId, function (error, status, result) {
                if (error) {
                    cb(error);
                } else {
                    var status = status;
                    var score = result;

                    if (status == 'OK') {
                        memberData['verifyScore'] = score;
                    } else {
                        memberData['verifyScore'] = 0
                    }

                    privacySettings(app, remoteMethodOutput, memberData, next);

                }
            });

        }

    });

    // END - AFTER REMOTE ========================================================================

    // BEGIN - REMOTE METHOD =====================================================================

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
    });

    Likelist.remoteMethod('getLikeMeList', {
        description: 'Get like me list',
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'array', root: true }
    });

    Likelist.remoteMethod('getILikeList', {
        description: 'Get I Like list',
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'array', root: true }
    });

    // END - REMOTE METHOD =======================================================================

    // BEGIN - FUNCTIONS =========================================================================

    Likelist.doLike = doLike;
    Likelist.getLikeMeList = getLikeMeList;
    Likelist.getILikeList = getILikeList;

    // END - FUNCTIONS ===========================================================================

    function doLike(userId, options, cb) {

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

    function getLikeMeList(limit, offset, options, cb) {

        var Matchmember = app.models.MatchMember;

        var token = options.accessToken;
        var userId = token.userId;

        Matchmember.getMemberIdMatchList(userId, function (error, result) {
            if (error) {
                cb(error);
            }
            var filter = {
                fields: ['likeUser'],
                where: {
                    and: [
                        { likeMember: userId },
                        { likeUser: { nin: result } }
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
                            'bday'
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
            Likelist.find(filter, function (error, result) {
                if (error) {
                    cb(error);
                }
                var likeMeList = [];
                result.forEach(function (item) {
                    item = JSON.parse(JSON.stringify(item));

                    var memberData = item.members;

                    memberData.hobby = JSON.parse(memberData.hobby);

                    var bdayDate = new Date(memberData.bday);
                    memberData.age = common.calculateAge(bdayDate);

                    likeMeList.push(memberData);
                }, this);

                filterPrivacy.apply(userId, likeMeList, function (error, result) {
                    if (error) {
                        cb(error);
                    }
                    cb(null, result);
                });
            })
        })
    }

    function getILikeList(limit, offset, options, cb) {

        var Matchmember = app.models.MatchMember;

        var token = options.accessToken;
        var userId = token.userId;

        Matchmember.getMemberIdMatchList(userId, function (error, result) {
            if (error) {
                cb(error);
            }
            var filter = {
                fields: ['likeMember'],
                where: {
                    and: [
                        { likeUser: userId },
                        { likeMember: { nin: result } }
                    ]
                },
                include: {
                    relation: 'members2',
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
                            'bday'
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
            Likelist.find(filter, function (error, result) {
                if (error) {
                    cb(error);
                }
                var iLikeList = [];
                result.forEach(function (item) {
                    item = JSON.parse(JSON.stringify(item));

                    var memberData = item.members2;

                    memberData.hobby = JSON.parse(memberData.hobby);

                    var bdayDate = new Date(memberData.bday);
                    memberData.age = common.calculateAge(bdayDate);

                    iLikeList.push(memberData);
                }, this);

                filterPrivacy.apply(userId, iLikeList, function (error, result) {
                    if (error) {
                        cb(error);
                    }
                    cb(null, result);
                });
                // cb(null, iLikeList);
            })
        })
    }

    // function getLikeMeList(options, cb) {
    //     var common = require('../common-util.js');

    //     var memberData = {};
    //     var token = options.accessToken;
    //     var userId = token.userId;

    //     memberData['id'] = userId;

    //     var filter = {
    //         fields: ['likeUser'],
    //         where: { likeMember: userId },
    //         include: {
    //             relation: 'userLike',
    //             scope: {
    //                 fields: [
    //                     'id',
    //                     'fullName',
    //                     'online',
    //                     'employeeType',
    //                     'zodiac',
    //                     'religion',
    //                     'address',
    //                     'bday',
    //                     'income',
    //                     'about',
    //                     'hobby',
    //                     'race',
    //                     'degree',
    //                     'zodiac'
    //                 ],
    //                 include: ['memberPhotos', 'rel_visibility']
    //             }
    //         }
    //     };

    //     Likelist.find(filter, function (error, result) {
    //         if (error) {
    //             cb(error);
    //         } else {
    //             var likeMeList = result;

    //             common.asyncLoop(likeMeList.length, function (loop) {
    //                 var index = loop.iteration();
    //                 var item = likeMeList[index];

    //                 getLikeStatus(userId, item.likeUser, function (error, result) {
    //                     if (error) {
    //                         cb(error);
    //                     } else {
    //                         item['isLiked'] = result;

    //                         getDislikeStatus(userId, item.likeUser, function (error, result) {
    //                             if (error) {
    //                                 cb(error);
    //                             } else {
    //                                 item['isDisliked'] = result;
    //                                 loop.next();
    //                             }
    //                         });
    //                     }
    //                 });
    //             }, function () {

    //                 getCurrentUserVerifyScore(memberData, function (error, result) {

    //                     // cb(null, likeMeList);
    //                     verify(likeMeList);

    //                 })

    //             });
    //         }
    //     });

    //     function getCurrentUserVerifyScore(memberData, callback) {

    //         var Memberverifystatus = app.models.MemberVerifyStatus;

    //         Memberverifystatus.getVerifyScoreByUserId(memberData.userId, function (error, status, result) {
    //             if (error) {
    //                 cb(error);
    //             } else {
    //                 var status = status;
    //                 var score = result;

    //                 if (status == 'OK') {
    //                     memberData['verifyScore'] = score;
    //                 } else {
    //                     memberData['verifyScore'] = 0
    //                 }

    //                 callback(null, memberData);

    //             }
    //         });

    //     }

    //     /**
    //      * Function Verify
    //      */
    //     function verify(params) {

    //         let isVerify;
    //         if (memberData.verifyScore != null) {
    //             isVerify = (memberData.verifyScore < 20) ? false : true;
    //         } else {
    //             isVerify = false;
    //         }

    //         async.eachOfSeries(params, function (member, key, callback) {

    //             let value = member.userLike();

    //             // SORRY, FASTEST WAY IS USING NATIVE QUERY
    //             var query = new String();
    //             query = query.concat(' SELECT match_id, COUNT(*) AS \'count\' FROM Match_member ')
    //                 .concat(' WHERE members_id = ? OR members_id = ? ')
    //                 .concat(' GROUP BY match_id HAVING count > 1 ');

    //             var params = [memberData.id, value.id];

    //             app.models.NearbyView.dataSource.connector.execute(query, params, function (error, result) {
    //                 if (error) {
    //                     callback();
    //                 } else {
    //                     let isMatch;
    //                     if (result.length > 0) {
    //                         isMatch = true;
    //                     } else {
    //                         isMatch = false;
    //                     }

    //                     if (value.hobby != null && value.hobby != undefined) {
    //                         value.hobby = value.hobby.replace("[", "").replace("]", "").replace(/"/gi, '');
    //                     }

    //                     if (value.rel_visibility == null || value.rel_visibility == undefined) {
    //                         callback();
    //                     } else {

    //                         if (value.rel_visibility().length == 0) {
    //                             callback();
    //                         } else {

    //                             async.eachOfSeries(value.rel_visibility(), function (value2, key, callback) {

    //                                 switch (value2.filterId) {
    //                                     case 1:

    //                                         var hasil = value.fullName;
    //                                         value.fullName = value.fullName.split(" ")[0] + ' XXX';

    //                                         if (value2.verified) {
    //                                             if (isVerify == true) {
    //                                                 value.fullName = hasil;
    //                                             }
    //                                         }

    //                                         if (value2.unverified) {
    //                                             if (isVerify == false) {
    //                                                 value.fullName = hasil;
    //                                             }
    //                                         }

    //                                         if (value2.match) {
    //                                             if (isMatch == true) {
    //                                                 value.fullName = hasil;
    //                                             }
    //                                         }

    //                                         callback();
    //                                         break;
    //                                     case 2:

    //                                         callback();
    //                                         break;
    //                                     case 3:

    //                                         var hasil = value.income;
    //                                         value.income = 'Privacy';

    //                                         if (value2.verified) {
    //                                             if (isVerify == true) {
    //                                                 value.income = hasil;
    //                                             }
    //                                         }

    //                                         if (value2.unverified) {
    //                                             if (isVerify == false) {
    //                                                 value.income = hasil;
    //                                             }
    //                                         }

    //                                         if (value2.match) {
    //                                             if (isMatch == true) {
    //                                                 value.income = hasil;
    //                                             }
    //                                         }

    //                                         callback();
    //                                         break;
    //                                     case 4:

    //                                         var hasil = value.degree;
    //                                         value.degree = 'Privacy';

    //                                         if (value2.verified) {
    //                                             if (isVerify == true) {
    //                                                 value.degree = hasil;
    //                                             }
    //                                         }

    //                                         if (value2.unverified) {
    //                                             if (isVerify == false) {
    //                                                 value.degree = hasil;
    //                                             }
    //                                         }

    //                                         if (value2.match) {
    //                                             if (isMatch == true) {
    //                                                 value.degree = hasil;
    //                                             }
    //                                         }

    //                                         callback();
    //                                         break;
    //                                     case 5:

    //                                         callback();
    //                                         break;
    //                                     default:
    //                                         callback();
    //                                         break;
    //                                 }


    //                             }, function (err) {
    //                                 if (err) console.error(err.message);
    //                                 callback();
    //                             });

    //                         }

    //                     }

    //                 }
    //             })

    //         }, function (err) {
    //             if (err) console.error(err.message);
    //             // configs is now a map of JSON data

    //             cb(null, params);

    //         });

    //     }

    //     function getLikeStatus(myUserId, targetUserId, callback) {

    //         var filter = {
    //             where: {
    //                 likeUser: myUserId,
    //                 likeMember: targetUserId
    //             }
    //         };
    //         Likelist.findOne(filter, function (error, result) {
    //             if (error) {
    //                 callback(error);
    //             } else {
    //                 if (result) {
    //                     callback(null, true);
    //                 } else {
    //                     callback(null, false);
    //                 }
    //             }
    //         });
    //     }

    //     function getDislikeStatus(myUserId, targetUserId, callback) {
    //         var Dislikelist = app.models.DislikeList;

    //         var filter = {
    //             where: {
    //                 dislikeUser: myUserId,
    //                 dislikeMamber: targetUserId
    //             }
    //         };
    //         Dislikelist.findOne(filter, function (error, result) {
    //             if (error) {
    //                 callback(error);
    //             } else {
    //                 if (result) {
    //                     callback(null, true);
    //                 } else {
    //                     callback(null, false);
    //                 }
    //             }
    //         })

    //     }

    // }



    /**
     * Function Verify
     */
    function privacySettings(app, params, memberData, next) {

        let async = require("async");

        let isVerify;
        if (memberData.verifyScore != null) {
            isVerify = (memberData.verifyScore < 20) ? false : true;
        } else {
            isVerify = false;
        }

        async.eachOfSeries(params, function (member, key, callback) {

            if (member.membersLike() != null && member.membersLike() != undefined) {

                let value = member.membersLike();
                // SORRY, FASTEST WAY IS USING NATIVE QUERY
                var query = new String();
                query = query.concat(' SELECT match_id, COUNT(*) AS \'count\' FROM Match_member ')
                    .concat(' WHERE members_id = ? OR members_id = ? ')
                    .concat(' GROUP BY match_id HAVING count > 1 ');

                app.models.NearbyView.dataSource.connector.execute(query, [memberData.id, value.id], function (error, result) {
                    if (error) {
                        callback();
                    } else {
                        let isMatch;
                        if (result.length > 0) {
                            isMatch = true;
                        } else {
                            isMatch = false;
                        }

                        if (value.hobby != null && value.hobby != undefined) {
                            value.hobby = value.hobby.replace("[", "").replace("]", "").replace(/"/gi, '');
                        }

                        if (value.rel_visibility == null || value.rel_visibility == undefined) {
                            callback();
                        } else {

                            if (value.rel_visibility().length == 0) {
                                callback();
                            } else {

                                async.eachOfSeries(value.rel_visibility(), function (value2, key, callback) {

                                    switch (value2.filterId) {
                                        case 1:

                                            var hasil = value.fullName;
                                            value.fullName = value.fullName.split(" ")[0] + ' XXX';

                                            if (value2.verified) {
                                                if (isVerify == true) {
                                                    value.fullName = hasil;
                                                }
                                            }

                                            if (value2.unverified) {
                                                if (isVerify == false) {
                                                    value.fullName = hasil;
                                                }
                                            }

                                            if (value2.match) {
                                                if (isMatch == true) {
                                                    value.fullName = hasil;
                                                }
                                            }

                                            callback();
                                            break;
                                        case 2:

                                            callback();
                                            break;
                                        case 3:

                                            var hasil = value.income;
                                            value.income = 'Privacy';

                                            if (value2.verified) {
                                                if (isVerify == true) {
                                                    value.income = hasil;
                                                }
                                            }

                                            if (value2.unverified) {
                                                if (isVerify == false) {
                                                    value.income = hasil;
                                                }
                                            }

                                            if (value2.match) {
                                                if (isMatch == true) {
                                                    value.income = hasil;
                                                }
                                            }

                                            callback();
                                            break;
                                        case 4:

                                            var hasil = value.degree;
                                            value.degree = 'Privacy';

                                            if (value2.verified) {
                                                if (isVerify == true) {
                                                    value.degree = hasil;
                                                }
                                            }

                                            if (value2.unverified) {
                                                if (isVerify == false) {
                                                    value.degree = hasil;
                                                }
                                            }

                                            if (value2.match) {
                                                if (isMatch == true) {
                                                    value.degree = hasil;
                                                }
                                            }

                                            callback();
                                            break;
                                        case 5:

                                            callback();
                                            break;
                                        default:
                                            callback();
                                            break;
                                    }


                                }, function (err) {
                                    if (err) console.error(err.message);
                                    callback();
                                });

                            }

                        }

                    }
                })

            } else {
                callback();
            }

        }, function (err) {
            if (err) console.error(err.message);
            // configs is now a map of JSON data

            console.log(
                'Hasil', params
            );

            next();

        });

    }


};
