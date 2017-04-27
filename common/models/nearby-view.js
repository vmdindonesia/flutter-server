'use strict';

module.exports = function (Nearbyview) {
    var app = require('../../server/server');
    var loopback = require('loopback');
    var lodash = require('lodash');
    var common = require('../common-util.js');
    let async = require("async");

    Nearbyview.remoteMethod('getNearbyLocation', {
        description: 'Get Nearby Member List of User',
        http: { path: '/:id/getNearbyLocation', verb: 'get' },
        accepts: { arg: 'id', type: 'number', required: true },
        returns: { arg: 'location', type: 'Object', root: true }
    });

    Nearbyview.getNearbyLocation = function (id, cb) {
        var memberResult;
        var excludeByFilterList = [];
        var Members = app.models.Members;
        var memberData = {};
        var myLocation;
        var setting;

        // Get setting user
        var filter = {
            fields: ['email', 'fullName', 'id', 'gender'],
            include: [{
                relation: 'nearbies',
                scope: {
                    fields: { geolocation: true }
                }
            }, 'settingHome']
        };

        // Function 1
        Members.findById(id, filter, function (error, result) {
            if (error) {
                cb(error);
            } else {
                memberResult = result;
                // console.log(member);

                //Get near by my location
                myLocation = new loopback.GeoPoint({
                    lat: memberResult.nearbies().geolocation.lat,
                    lng: memberResult.nearbies().geolocation.lng
                });

                setting = memberResult.settingHome();

                // GET NEARBY MEMBERS
                // getMember(id, myLocation, setting);
                getMemberData(id);
            }

        });

        // Function 2
        // Get Data Member
        function getMemberData(id) {
            Members.findById(id, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    memberData = result;

                    getCurrentUserVerifyScore(id);
                }
            });
        }

        // Function 3
        // Get Verify Score
        function getCurrentUserVerifyScore(id) {
            var Memberverifystatus = app.models.MemberVerifyStatus;

            Memberverifystatus.getVerifyScoreByUserId(id, function (error, status, result) {
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

                    getExlcudeList(id);
                }
            });

        }

        // Function 3
        // Get exclude filter
        function getExlcudeList(id) {
            memberData['age'] = common.calculateAge(memberData['bday']);
            var Settinghome = app.models.SettingHome;

            var filter = {
                fields: { memberId: true },
                where: {
                    or: [
                        { ageLower: { gt: memberData.age } },
                        { ageUpper: { lt: memberData.age } },
                        { smoke: { neq: memberData.smoke } },
                        { income: { neq: memberData.income } },
                        { verify: { lt: memberData.verifyScore } }
                    ]
                }
            }

            Settinghome.find(filter, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    result.forEach(function (item) {
                        excludeByFilterList.push(item.memberId);
                    }, this);

                    getMember(id);
                }
            })
        }

        // Function 4
        // Get data from setting user
        function getMember(id) {
            var filter = {
                include: 'rel_visibility',
                where: {
                    id: { neq: id },
                    id: { nin: excludeByFilterList },
                    gender: { neq: memberResult.gender },
                    age: {
                        between: [setting.ageLower, setting.ageUpper]
                    },
                    visibility: setting.visibility,
                    geolocation: {
                        near: myLocation,
                        maxDistance: setting.distance,
                        unit: 'kilometers'
                    }
                }
            }

            // Config filter religion
            if (!lodash.isEmpty(JSON.parse(setting.religion))) {
                filter.where['religion'] = { inq: JSON.parse(setting.religion) };
            }

            // Config filter zodiac
            if (!lodash.isEmpty(JSON.parse(setting.zodiac))) {
                filter.where['zodiac'] = { inq: JSON.parse(setting.zodiac) };
            }

            // // Config filter smoke
            if (!lodash.isNull(setting.smoke)) {
                filter.where['smoke'] = setting.smoke;
            }
            
            // Config filter verify
            if (!lodash.isNull(setting.verify)) {
                filter.where['verify'] = { gte: setting.verify };
            }

            // Config filter income
            if (!lodash.isNull(setting.income)) {
                filter.where['income'] = { gte: setting.income };
            }

            // Getting data from db
            Nearbyview.find(filter, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    getDistance(myLocation, result);
                }
            });
        }

        // Function 5
        function getDistance(myLocation, nearbyList) {
            var common = require('../common-util.js');

            var newResult = [];
            if (!lodash.isEmpty(nearbyList)) {
                lodash.forEach(nearbyList, function (data) {
                    data['distanceTo'] = myLocation.distanceTo(data.geolocation, { type: 'kilometers' }).toFixed(2);
                    newResult.push(data);
                });
            }

            common.asyncLoop(newResult.length, function (loop) {
                var index = loop.iteration();
                var item = newResult[index];
                getMatchStatus(id, item.id, function (error, result) {
                    if (error) {
                        cb(error);
                    } else {
                        item['isMatch'] = result;
                        getLikeStatus(id, item.id, function (error, result) {
                            if (error) {
                                cb(error);
                            } else {
                                item['isLiked'] = result;
                                getDislikeStatus(id, item.id, function (error, result) {
                                    if (error) {
                                        cb(error);
                                    } else {
                                        item['isDisliked'] = result;
                                        loop.next();
                                    }
                                })
                            }
                        });
                    }
                });
            }, function () {
                //AFTER LOOP

                console.log(newResult);

                // cb(null, newResult);
                verify(newResult);
            })
        }

        /**
         * Function Verify
         */
        function verify(params) {

            let isVerify;
            if (memberData.verifyScore != null) {
                isVerify = (memberData.verifyScore < 20) ? false : true;
            } else {
                isVerify = false;
            }

            async.eachOfSeries(params, function (value, key, callback) {

                // SORRY, FASTEST WAY IS USING NATIVE QUERY
                var query = new String();
                query = query.concat(' SELECT match_id, COUNT(*) AS \'count\' FROM Match_member ')
                    .concat(' WHERE members_id = ? OR members_id = ? ')
                    .concat(' GROUP BY match_id HAVING count > 1 ');

                var params = [memberData.id, value.id];

                app.models.NearbyView.dataSource.connector.execute(query, params, function (error, result) {
                    if (error) {
                        callback();
                    } else {
                        let isMatch;
                        if (result.length > 0) {
                            isMatch = true;
                        } else {
                            isMatch = false;
                        }

                        if (value.rel_visibility == null || value.rel_visibility == undefined) {
                            callback();
                        } else {

                            if (value.rel_visibility.length == 0) {
                                callback();
                            } else {

                                async.eachOfSeries(value.rel_visibility, function (value2, key, callback) {

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

            }, function (err) {
                if (err) console.error(err.message);
                // configs is now a map of JSON data

                cb(null, params);

            });

        }

        function getMatchStatus(userId1, userId2, callback) {
            // var Likelist = app.models.LikeList;

            // SORRY, FASTEST WAY IS USING NATIVE QUERY
            var query = new String();
            query = query.concat(' SELECT match_id, COUNT(*) AS \'count\' FROM Match_member ')
                .concat(' WHERE members_id = ? OR members_id = ? ')
                .concat(' GROUP BY match_id HAVING count > 1 ');

            var params = [userId1, userId2];

            Nearbyview.dataSource.connector.execute(query, params, function (error, result) {
                if (error) {
                    callback(error);
                } else {
                    if (result.length > 0) {
                        callback(null, true);
                    } else {
                        callback(null, false);
                    }
                }
            })
        }

        function getLikeStatus(myUserId, targetUserId, callback) {
            var Likelist = app.models.LikeList;

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
