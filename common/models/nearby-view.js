'use strict';

module.exports = function (Nearbyview) {
    var app = require('../../server/server');
    var loopback = require('loopback');
    var lodash = require('lodash');
    var common = require('../common-util.js');
    let async = require("async");
    var filterPrivacy = require('../filter-privacy.js');

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

            var orList = [];

            orList.push({ ageLower: { gt: memberData.age } });
            orList.push({ ageUpper: { lt: memberData.age } });

            if (!lodash.isNull(memberData.smoke)) {
                orList.push({ smoke: { neq: memberData.smoke } });
            }

            if (!lodash.isNull(memberData.income)) {
                orList.push({ income: { gt: memberData.income } });
            }

            if (!lodash.isNull(memberData.verify)) {
                orList.push({ verify: { gt: memberData.verifyScore } });
            }

            var filter = {
                fields: { memberId: true },
                where: {
                    or: orList
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
            });
        }

        // Function 4
        // Get data from setting user
        function getMember(id) {

            var andList = [];

            andList.push({ id: { neq: id } });
            andList.push({ id: { nin: excludeByFilterList } });
            andList.push({ gender: { neq: memberResult.gender } });
            andList.push({ age: { between: [setting.ageLower, setting.ageUpper] } });
            andList.push({ visibility: 1 });

            // Config filter religion
            if (!lodash.isEmpty(JSON.parse(setting.religion))) {
                // filter.where['religion'] = { inq: JSON.parse(setting.religion) };
                andList.push({ religion: { inq: JSON.parse(setting.religion) } });
            }

            // // Config filter zodiac
            if (!lodash.isEmpty(JSON.parse(setting.zodiac))) {
                // filter.where['zodiac'] = { inq: JSON.parse(setting.zodiac) };
                andList.push({ zodiac: { inq: JSON.parse(setting.zodiac) } });
            }

            // Config filter smoke
            if (!lodash.isNull(setting.smoke)) {
                // filter.where['smoke'] = setting.smoke;
                andList.push({ smoke: setting.smoke });
            }

            // Config filter verify
            if (!lodash.isNull(setting.verify)) {
                // filter.where['verify'] = { gte: setting.verify };
                andList.push({ verify: { gte: setting.verify } })
            }

            if (setting.income == 0) {
                setting.income = null;
            }
            // Config filter income
            if (!lodash.isNull(setting.income)) {
                // filter.where['income'] = { gte: parseInt(setting.income) };
                andList.push({ income: { gte: parseInt(setting.income) } });
            }

            var filter = {
                fields: ['id', 'geolocation'],
                // include: 'rel_visibility',
                where: {
                    and: andList,
                    geolocation: {
                        near: myLocation,
                        maxDistance: setting.distance,
                        unit: 'kilometers'
                    }
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
                }
            }

            // Getting data from db
            Nearbyview.find(filter, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    var nearbyList = [];
                    result.forEach(function (item) {
                        if ('members' in item) {
                            item = JSON.parse(JSON.stringify(item));

                            var memberData = item.members;
                            var geolocation = item.geolocation;
                            // memberData['geolocation'] = geolocation;
                            memberData.geolocation = geolocation;
                            if (typeof memberData !== 'undefined') {
                                memberData.hobby = JSON.parse(memberData.hobby);

                                var bdayDate = new Date(memberData.bday);
                                memberData.age = common.calculateAge(bdayDate);

                                nearbyList.push(memberData);

                            }
                        }
                    }, this);
                    getDistance(myLocation, nearbyList);
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

                filterPrivacy.apply(id, newResult, function (error, result) {
                    if (error) {
                        cb(error);
                    }
                    cb(null, result);
                });
            })
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
