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
                        likeAndDislikeIdList.push(item.likeMember);
                    }, this);
                    callback(getHomeListByFilter)
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
                        likeAndDislikeIdList.push(item.likeMember);
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
            console.log('GET HOME LIST BY SETTING');
            var gender = memberData.gender;

            Viewhome.find({
                where: {
                    and: [
                        { age: { between: [homeSettingData.ageLower, homeSettingData.ageUpper] } },
                        { id: { nin: likeAndDislikeIdList } },
                        { gender: { neq: gender } }
                    ]
                },
                limit: limit
            }, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    cb(null, result);
                }
            })
        }
    }
};
