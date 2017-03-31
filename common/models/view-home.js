'use strict';

module.exports = function (Viewhome) {
    var app = require('../../server/server');

    Viewhome.remoteMethod('getHomeList', {
        description: 'Get List of Data for Home Page (Find My Love)',
        http: { verb: 'post' },
        accepts: [
            { arg: 'limit', type: 'number' },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'array' }
    })

    Viewhome.getHomeList = function (limit, options, cb) {
        var homeSettingData = {};
        var likeAndDislikeIdList = [];
        var memberData = {};

        var token = options.accessToken;
        var userId = token.userId;
        getHomeSetting(getLikeIdList);

        //GET HOME SETTING FUNCTION1
        function getHomeSetting(callback) {
            console.log('GET HOME SETTING');
            var Settinghome = app.models.SettingHome;
            Settinghome.findOne({
                where: {
                    memberId: userId
                }
            }, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    if (result) {
                        homeSettingData = result;
                        callback(getDislikeIdList);
                    } else {
                        console.log('FAILED TO FIND HOME SETTING');
                        console.log('OR MAYBE I SHOULD INIT FOR YOU');
                        Settinghome.registerSettingHome(options, function (error, result) {
                            if (error) {
                                cb(error);
                            } else {
                                homeSettingData = result;
                                callback(getDislikeIdList);
                            }
                        });
                    }
                }
            })

        }

        //GET LIKE LIST FUNCTION2
        function getLikeIdList(callback) {
            console.log('GET LIKE LIST');
            var Likelist = app.models.LikeList;
            Likelist.find({
                fields: { likeMember: true },
                where: { likeUser: userId }
            }, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    result.forEach(function (item) {
                        if (item) {
                            likeAndDislikeIdList.push(item.likeMember);
                        }
                    }, this);
                    callback(getMemberData)
                }
            })

        }

        //GET LIKE LIST FUNCTION3
        function getDislikeIdList(callback) {
            console.log('GET DISLIKE LIST');
            var Dislikelist = app.models.DislikeList;
            Dislikelist.find({
                fields: { dislikeMamber: true },
                where: { dislikeUser: userId }
            }, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    result.forEach(function (item) {
                        if (item) {
                            likeAndDislikeIdList.push(item.dislikeMamber);
                        }
                    }, this);
                    callback(getHomeListByFilter);
                }
            })

        }

        //GET MEMBER DATA FUNCTION4
        function getMemberData(callback) {
            console.log('GET MEMBER DATA');
            var Members = app.models.Members;
            Members.findById(userId, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    memberData = result;
                    callback();
                }

            })
        }

        //FILTER VIEW HOME BY MEMBER SETTING + LIMIT BY PARAMETER FUNCTION5
        function getHomeListByFilter() {
            var Memberverifystatus = app.models.MemberVerifyStatus;
            console.log('GET HOME LIST BY SETTING');
            var gender = memberData.gender;
            var filter = {
                where: {
                    and: [
                        { age: { between: [homeSettingData.ageLower, homeSettingData.ageUpper] } },
                        { id: { nin: likeAndDislikeIdList } },
                        { gender: { neq: gender } }
                    ]
                },
                limit: limit
            };
            console.log('FILTER : ' + JSON.stringify(filter));
            Viewhome.find(filter, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    var homeList = result;
                    asyncLoop(homeList.length, function (loop) {
                        var index = loop.iteration();
                        Memberverifystatus.getVerifyScoreByUserId(homeList[index].id, function (error, status, result) {
                            if (error) {
                                cb(error)
                            } else {
                                console.log('RESULT IN ARRAY : ' + index + '_' + result);
                                var status = status;
                                var score = result;

                                if (status == 'OK') {
                                    homeList[index]['verifyScore'] = score;
                                } else {
                                    homeList[index]['verifyScore'] = 0
                                }
                                loop.next();
                            }
                        })
                    }, function () {
                        cb(null, homeList);
                    })
                }
            })
        }

        function asyncLoop(iterations, func, callback) {
            var index = 0;
            var done = false;
            var loop = {
                next: function () {
                    if (done) {
                        return;
                    }

                    if (index < iterations) {
                        index++;
                        func(loop);

                    } else {
                        done = true;
                        callback();
                    }
                },

                iteration: function () {
                    return index - 1;
                },

                break: function () {
                    done = true;
                    callback();
                }
            };
            loop.next();
            return loop;
        }

    }
};
