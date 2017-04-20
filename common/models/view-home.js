'use strict';

module.exports = function (Viewhome) {
    var app = require('../../server/server');
    var common = require('../common-util.js');

    Viewhome.remoteMethod('getHomeList', {
        description: 'Get List of Data for Home Page (Find My Love)',
        http: { verb: 'post' },
        accepts: [
            { arg: 'limit', type: 'number', required: true },
            { arg: 'excludeList', type: 'array', description: 'Optional Exclude list', required: false },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'array' }
    })

    Viewhome.getHomeList = function (limit, excludeList, options, cb) {
        var homeSettingData = {};
        var likeAndDislikeIdList = [];
        var memberData = {};
        var excludeByFilterList = [];

        var token = options.accessToken;
        var userId = token.userId;
        getHomeSetting(getLikeIdList);

        //GET HOME SETTING FUNCTION1
        function getHomeSetting(callback) {
            // console.log('GET HOME SETTING');
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
                        getLikeIdList();
                        // callback(getDislikeIdList);
                    } else {
                        // console.log('FAILED TO FIND HOME SETTING');
                        // console.log('OR MAYBE I SHOULD INIT FOR YOU');
                        Settinghome.registerSettingHome(options, function (error, result) {
                            if (error) {
                                cb(error);
                            } else {
                                homeSettingData = result;
                                getLikeIdList();
                                // callback(getDislikeIdList);
                            }
                        });
                    }
                }
            })

        }

        //GET LIKE LIST FUNCTION2
        function getLikeIdList() {
            // console.log('GET LIKE LIST');
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
                    getDislikeIdList();
                    // callback(getMemberData);
                }
            })

        }

        //GET LIKE LIST FUNCTION3
        function getDislikeIdList() {
            // console.log('GET DISLIKE LIST');
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
                    getMemberData();
                    // callback(getHomeListByFilter);
                }
            })

        }

        //GET MEMBER DATA FUNCTION4
        function getMemberData() {
            // console.log('GET MEMBER DATA');
            var Members = app.models.Members;
            Members.findById(userId, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    memberData = result;
                    getCurrentUserVerifyScore();
                    // getHomeListByFilter();
                    // callback();
                }

            })
        }

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
                    getNotIncludedByVisibility();
                }
            });

        }

        function getNotIncludedByVisibility() {
            // AMBIL DATA DARI USER SESUAI DENGAN SETTING YANG DIPAKAI.
            // MISAL DIMULAI DARI UMUR.
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
                        { verify: { lte: memberData.verifyScore } }
                    ]
                }
            }
            // console.log(JSON.stringify(filter));
            Settinghome.find(filter, function (error, result) {
                if (error) {
                    cb(error);
                }
                result.forEach(function (item) {
                    excludeByFilterList.push(item.memberId);
                }, this);
                getHomeListByFilter();
            })



        }

        //FILTER VIEW HOME BY MEMBER SETTING + LIMIT BY PARAMETER FUNCTION5
        function getHomeListByFilter() {
            // var Memberverifystatus = app.models.MemberVerifyStatus;
            // console.log('GET HOME LIST BY SETTING');
            var gender = memberData.gender;

            var excludeIdList = [];
            if (excludeList) {
                excludeList.forEach(function (item) {
                    excludeIdList.push(item.id);
                }, this);
            }
            var andList = [
                { age: { between: [homeSettingData.ageLower, homeSettingData.ageUpper] } },
                { id: { nin: likeAndDislikeIdList } },
                { id: { nin: excludeIdList } },
                { id: { nin: excludeByFilterList } },
                { gender: { neq: gender } }
            ];
            // console.log(JSON.stringify(homeSettingData));
            if (homeSettingData.religion) {
                andList.push({ religion: { inq: JSON.parse(homeSettingData.religion) } });
            }
            if (homeSettingData.verify) {
                andList.push({ verifyScore: { gte: homeSettingData.verify } });
            }
            if (homeSettingData.smoke) {
                andList.push({ smoke: homeSettingData.smoke });
            }
            if (homeSettingData.income) {
                andList.push({ income: homeSettingData.income });
            }
            var filter = {
                where: {
                    and: andList
                },
                limit: limit
            };
            // console.log('FILTER : ' + JSON.stringify(filter));
            Viewhome.find(filter, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    var homeList = result;
                    // common.asyncLoop(homeList.length, function (loop) {
                    //     var index = loop.iteration();
                    //     Memberverifystatus.getVerifyScoreByUserId(homeList[index].id, function (error, status, result) {
                    //         if (error) {
                    //             cb(error)
                    //         } else {
                    //             // console.log('RESULT IN ARRAY : ' + index + '_' + result);
                    //             var status = status;
                    //             var score = result;

                    //             if (status == 'OK') {
                    //                 homeList[index]['verifyScore'] = score;
                    //             } else {
                    //                 homeList[index]['verifyScore'] = 0
                    //             }
                    //             loop.next();
                    //         }
                    //     })
                    // }, function () {
                    //     cb(null, homeList);
                    // });
                    cb(null, homeList);
                }
            })
        }
    }
};
