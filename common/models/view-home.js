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
        var excludeBlockList = [];

        var token = options.accessToken;
        var userId = token.userId;
        getHomeSetting(getLikeIdList);

        //GET HOME SETTING FUNCTION1
        function getHomeSetting(callback) {
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
                    } else {
                        Settinghome.registerSettingHome(options, function (error, result) {
                            if (error) {
                                cb(error);
                            } else {
                                homeSettingData = result;
                                getLikeIdList();
                            }
                        });
                    }
                }
            })

        }

        //GET LIKE LIST FUNCTION2
        function getLikeIdList() {
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
                }
            })

        }

        //GET LIKE LIST FUNCTION3
        function getDislikeIdList() {
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
                }
            })

        }

        //GET MEMBER DATA FUNCTION4
        function getMemberData() {
            var Members = app.models.Members;
            Members.findById(userId, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    memberData = result;
                    getCurrentUserVerifyScore();
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

            var orList = [];

            orList.push({ ageLower: { gt: memberData.age } });

            if (memberData.age >= 60) {
                orList.push({ and: [{ ageUpper: { lt: memberData.age } }, { ageUpper: { neq: 60 } }] });
            } else {
                orList.push({ ageUpper: { lt: memberData.age } });
            }


            if (!_.isNull(memberData.smoke)) {
                orList.push(
                    {
                        and: [
                            { smoke: { neq: memberData.smoke } },
                            { smoke: { neq: 2 } }
                        ]
                    }

                );
            }

            // if (!_.isNull(memberData.smoke)) {
            //     orList.push({ smoke: { neq: memberData.smoke } });
            // }

            // orList.push({ smoke: { neq: 2 } });

            if (!_.isNull(memberData.income)) {
                orList.push({ income: { gt: memberData.income } });
            }

            if (!_.isNull(memberData.verify)) {
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
                }
                result.forEach(function (item) {
                    excludeByFilterList.push(item.memberId);
                }, this);
                // getHomeListByFilter();
                excludeBlock();
            });

        }

        function excludeBlock() {
            var Block = app.models.Block;
            Block.getExcludeBlock(options, function (error, result) {
                if (error) {
                    return cb(error);
                }
                excludeBlockList = result;
                getHomeListByFilter();
            });

        }

        //FILTER VIEW HOME BY MEMBER SETTING + LIMIT BY PARAMETER FUNCTION5
        function getHomeListByFilter() {
            var Memberverifystatus = app.models.MemberVerifyStatus;
            var gender = memberData.gender;

            var excludeIdList = [];
            if (excludeList) {
                excludeList.forEach(function (item) {
                    excludeIdList.push(item.id);
                }, this);
            }
            var andList = [
                { id: { nin: likeAndDislikeIdList } },
                { id: { nin: excludeIdList } },
                { id: { nin: excludeByFilterList } },
                { id: { nin: excludeBlockList } },
                { gender: { neq: gender } }
            ];

            if (homeSettingData.ageUpper >= 60) {
                andList.push({ age: { gte: homeSettingData.ageLower } });
            } else {
                andList.push({ age: { between: [homeSettingData.ageLower, homeSettingData.ageUpper] } });
            }

            if (!_.isEmpty(JSON.parse(homeSettingData.religion))) {
                andList.push({ religion: { inq: JSON.parse(homeSettingData.religion) } });
            }
            if (!_.isEmpty(JSON.parse(homeSettingData.zodiac))) {
                andList.push({ zodiac: { inq: JSON.parse(homeSettingData.zodiac) } });
            }
            if (!_.isNull(homeSettingData.verify)) {
                andList.push({ verifyScore: { gte: homeSettingData.verify } });
            }

            if (homeSettingData.smoke == 2) {
                homeSettingData.smoke = null;
            }
            if (!_.isNull(homeSettingData.smoke)) {
                andList.push({ smoke: homeSettingData.smoke });
            }

            // //TAMBAHIN KALAU USER INCOMENYA NULL JUGA MASUK
            if (homeSettingData.income == 0) {
                homeSettingData.income = null;
            }
            if (!_.isNull(homeSettingData.income)) {
                andList.push({ income: { gte: homeSettingData.income } });
            }
            var filter = {
                where: {
                    and: andList
                },
                include: 'rel_visibility',
                limit: limit
            };

            Viewhome.find(filter, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    var homeList = result;
                    var tempObj = _.groupBy(result, 'points');
                    var tempList = [];
                    _.forEachRight(tempObj, function (value, key) {
                        tempList = tempList.concat(_.shuffle(value));
                    })
                    homeList = tempList;
                    // common.asyncLoop(homeList.length, function (loop) {
                    //     var index = loop.iteration();
                    //     var item = homeList[index];
                    //     Memberverifystatus.getVerifyScoreByUserId(item.id, function (error, status, result) {
                    //         if (error) {
                    //             return cb(error);
                    //         }
                    //         var status = status;
                    //         var score = result;

                    //         if (status == 'OK') {
                    //             item['verifyScore'] = score;
                    //         } else {
                    //             item['verifyScore'] = 0
                    //         }
                    //         loop.next();
                    //     });
                    // }, function () {
                    //     verify(homeList);
                    // });
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

                                async.eachOfSeries(value.rel_visibility(), function (value2, key, callback) {

                                    switch (value2.filterId) {
                                        case 1:
                                            value.fullName = value.fullName[0] + value.alias;

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

                                            var hasil = value.memberImage;
                                            // value.income = 'Privacy';
                                            value.memberImage = [];

                                            if (value2.verified) {
                                                if (isVerify == true) {
                                                    value.memberImage = hasil;
                                                }
                                            }

                                            if (value2.unverified) {
                                                if (isVerify == false) {
                                                    value.memberImage = hasil;
                                                }
                                            }

                                            if (value2.match) {
                                                if (isMatch == true) {
                                                    value.memberImage = hasil;
                                                }
                                            }

                                            callback();
                                            break;
                                        case 3:

                                            var hasil = value.income;
                                            if (!_.isNull(hasil)) {

                                                // value.income = 'Privacy';
                                                value.income = '****';

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

                                            }

                                            callback();
                                            break;
                                        case 4:

                                            var hasil = value.degree;
                                            if (!_.isNull(hasil)) {

                                                // value.degree = 'Privacy';
                                                value.degree = '****';

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

                                            }
                                            callback();
                                            break;
                                        case 5:

                                            var hasil = value.bday;
                                            // value.degree = 'Privacy';
                                            value.bday = '****';

                                            if (value2.verified) {
                                                if (isVerify == true) {
                                                    value.bday = hasil;
                                                }
                                            }

                                            if (value2.unverified) {
                                                if (isVerify == false) {
                                                    value.bday = hasil;
                                                }
                                            }

                                            if (value2.match) {
                                                if (isMatch == true) {
                                                    value.bday = hasil;
                                                }
                                            }

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
                cb(null, params);

            });

        }

    }
};
