'use strict';

module.exports = function (Matchmember) {
    var app = require('../../server/server');
    var common = require('../common-util.js');
    let async = require("async");

    // Matchmember.remoteMethod('getMatchMemberIdList', {
    //     description: 'Get List of Member Id which is Match with given User Id',
    //     http: { verb: 'get' },
    //     accepts: { arg: 'userId', type: 'number', required: true },
    //     returns: { arg: 'result', type: 'array', root: true, description: 'Array Of Id' }
    // });

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


    function getMatchList(limit, offset, options, cb) {

        var token = options.accessToken;
        var userId = token.userId;

        getMatchMemberIdList(userId, function (error, result) {
            if (error) {
                cb(error);
            }
            var filter = {
                fields: ['membersId'],
                where: {
                    id: { inq: result }
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

            Matchmember.find(filter, function (error, result) {
                if (error) {
                    cb(error);
                }
                var matchList = [];
                result.forEach(function (item) {
                    item = JSON.parse(JSON.stringify(item));

                    var memberData = item.members;

                    memberData.hobby = JSON.parse(memberData.hobby);

                    var bdayDate = new Date(memberData.bday);
                    memberData.age = common.calculateAge(bdayDate);

                    matchList.push(memberData);
                }, this);
                cb(null, matchList);
            })

        });


    }

    function getMatchMemberIdList(userId, cb) {

        var filter = {
            fields: ['matchId'],
            where: {
                membersId: userId
            }
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

        getMatchMemberIdList(userId, function (error, result) {
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

    // Matchmember.remoteMethod('createChat', {
    //     http: { path: '/createChat', verb: 'post' },
    //     accepts: { arg: 'param', type: 'Object' },
    //     returns: { arg: 'response', type: 'array',  root: true }
    // });

    // Matchmember.createChat = function(data, cb) {
    // 	var socket = Matchmember.app.io;

    //     Matchmember.create(data, function (err, result) {
    //     	if (err) {
    //     		cb(err);
    //     		return;
    //     	}

    //         socket.emit('chating', result);
    //     	cb(null, result);
    //     });
    // };

    Matchmember.afterRemote('find', function (context, remoteMethodOutput, next) {

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

            if (member.members() != null && member.members() != undefined) {

                let value = member.members();
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

                        console.log(value.rel_visibility(), 1231313131);
                        if (value.rel_visibility == null || value.rel_visibility == undefined || value.rel_visibility() == null || value.rel_visibility() == undefined) {
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
