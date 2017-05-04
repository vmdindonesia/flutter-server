'use strict';

module.exports = {
    apply: apply
}

function apply(userId, someList, cb) {

    var app = require('../server/server');
    var common = require('./common-util.js');
    var lodash = require('lodash');

    var Matchmember = app.models.MatchMember;
    var Memberverifystatus = app.models.MemberVerifyStatus;

    getCurrentUserStatus();

    function getCurrentUserStatus() {
        var matchWithMeUserIdList = [];

        common.asyncLoop(someList.length, function (loop) {
            var index = loop.iteration();
            var item = someList[index];

            Matchmember.isUserMatch(userId, item.id, function (error, result) {
                if (error) {
                    cb(error);
                }
                if (result) {
                    matchWithMeUserIdList.push(item.id);
                }
                loop.next();
            });

        }, function () {

            Memberverifystatus.getVerifyScoreByUserId(userId, function (error, status, result) {
                if (error) {
                    cb(error);
                }
                if (status == 'OK') {
                    var score = result;
                    if (score > 0) {
                        getUserConfig(true, matchWithMeUserIdList);
                        // filterData(true);
                    } else {
                        getUserConfig(false, matchWithMeUserIdList);
                        // filterData(false);
                    }
                } else {
                    cb(result);
                }
            });

        });
    }


    function getUserConfig(verifyStatus, matchUserIdList) {

        var someIdList = [];

        someList.forEach(function (item) {
            someIdList.push(item.id);
        }, this);

        var Visibilitydata = app.models.VisibilityData;

        var andList = [];
        if (verifyStatus) {
            andList.push({ verified: 0 });
        } else {
            andList.push({ unverified: 0 });
        }

        // andList.push({ match: 0 });

        var filter = {
            fields: ['membersId'],
            where: {
                and: [
                    { filterId: 1 },
                    { membersId: { inq: someIdList } }
                ]
            },
            include: {
                relation: 'visibilityData',
                scope: {
                    fields: ['filterId', 'match'],
                    where: {
                        and: andList
                    }
                }
            }
        }

        Visibilitydata.find(filter, function (error, result) {
            if (error) {
                cb(error);
            }

            result = JSON.parse(JSON.stringify(result));

            result.forEach(function (item) {
                if (matchUserIdList.indexOf(item.membersId) != -1) {
                    var delList = [];
                    for (var i = 0; i < item['visibilityData'].length; i++) {
                        var loopItem = item['visibilityData'][i];
                        if (loopItem.match == 1) {
                            delList.push(i);
                        }
                    }
                    delList.forEach(function (index) {
                        item['visibilityData'].splice(index, 1);
                    }, this);
                }
            }, this);

            someList.forEach(function (item) {
                var config = lodash.find(result, { membersId: item.id });

                if (typeof config !== 'undefined') {

                    config['visibilityData'].forEach(function (element) {
                        if (element.filterId == 1) {
                            item.fullName = item.fullName.split(" ")[0] + ' ****';
                        }

                        if (element.filterId == 2) {
                            item.memberImage = [];
                        }

                        if (element.filterId == 3) {
                            item.income = '****';
                        }

                        if (element.filterId == 4) {
                            item.degree = '****';
                        }

                        if (element.filterId == 5) {
                            item.bday = '****';
                        }

                    }, this);

                }

            }, this);

            cb(null, someList);

        });

    }

}