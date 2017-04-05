'use strict';

module.exports = function (Nearbyview) {
    var app = require('../../server/server');
    var loopback = require('loopback');
    var lodash = require('lodash');

    Nearbyview.remoteMethod('getNearbyLocation', {
        description: 'Get Nearby Member List of User',
        http: { path: '/:id/getNearbyLocation', verb: 'get' },
        accepts: { arg: 'id', type: 'number', required: true },
        returns: { arg: 'location', type: 'Object', root: true }
    });

    Nearbyview.getNearbyLocation = function (id, cb) {
        var Members = app.models.Members;

        var filter = {
            fields: { email: true, fullName: true, id: true },
            include: [{
                relation: 'nearbies',
                scope: {
                    fields: { geolocation: true }
                }
            }, 'memberSetting']
        };

        Members.findById(id, filter, function (error, result) {
            if (error) {
                cb(error);
            } else {
                var member = result;
                //Get near by my location
                var myLocation = new loopback.GeoPoint({
                    lat: member.nearbies().geolocation.lat,
                    lng: member.nearbies().geolocation.lng
                });

                var setting = member.memberSetting();

                // GET NEARBY MEMBERS
                getMember(id, myLocation, setting);
            }

        });

        function getMember(id, myLocation, setting) {

            // DEFAULT FILTER
            var filter = {
                where: {
                    id: { neq: id },
                    geolocation: {
                        near: myLocation,
                        maxDistance: setting.distance,
                        unit: 'kilometers'
                    },
                    age: {
                        between: [setting.ageLower, setting.ageUpper]
                    },
                    visibility: true
                }
            }

            // Config filter gender
            if (setting.men && !setting.women) {
                filter.where['gender'] = 0;
            } else if (setting.women && !setting.men) {
                filter.where['gender'] = 1;
            }

            // Config filter religion
            console.log(setting.religion);
            if (!lodash.isNull(setting.religion)) {
                filter.where['religion'] = { inq: JSON.parse(setting.religion) }
            }

            // Config filter zodiak
            if (!lodash.isNull(setting.zodiac)) {
                filter.where['zodiac'] = { inq: JSON.parse(setting.zodiac) }
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
                cb(null, newResult);
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
