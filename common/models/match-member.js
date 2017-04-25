'use strict';

module.exports = function (Matchmember) {
    var app = require('../../server/server');
    var common = require('../common-util.js');
    let async = require("async");

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

                            if (value.rel_visibility().length == 0 ) {
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
