'use strict';

module.exports = function (Viewhome) {
    var app = require('../../server/server');
    var common = require('../common-util.js');
    var _ = require('lodash');
    let async = require("async");

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

                    console.log(
                        status, result
                    );

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
                        { verify: { lt: memberData.verifyScore } }
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
            if (!_.isEmpty(JSON.parse(homeSettingData.religion))) {
                andList.push({ religion: { inq: JSON.parse(homeSettingData.religion) } });
            }
            if (homeSettingData.verify) {
                andList.push({ verifyScore: { gte: homeSettingData.verify } });
            }
            if (homeSettingData.smoke) {
                andList.push({ smoke: homeSettingData.smoke });
            }
            if (homeSettingData.income) {
                andList.push({ income: { gte: homeSettingData.income } });
            }
            var filter = {
                where: {
                    and: andList
                },
                include: 'rel_visibility',
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

                    // cb(null, homeList);
                    verify(homeList);

                }
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

                var params = [userId, value.id];

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

                        if (value.rel_visibility() == null || value.rel_visibility() == undefined) {
                            callback();
                        } else {

                            if (value.rel_visibility().length == 0) {
                                callback();
                            } else {

                                console.log(
                                    isVerify, isMatch
                                );

                                async.eachOfSeries(value.rel_visibility(), function (value2, key, callback) {

                                    switch (value2.filterId) {
                                        case 1:

                                            var hasil = value.fullName;
                                            value.fullName = value.fullName.split(" ")[0] + ' ****';

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
                console.log(
                    params
                );

                cb(null, params);

            });

        }

    }
};
