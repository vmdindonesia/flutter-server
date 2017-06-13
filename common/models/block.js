'use strict';

module.exports = function (Block) {
    var common = require('../common-util');
    var filterPrivacy = require('../filter-privacy');

    Block.remoteMethod('addBlock', {
        http: { verb: 'post' },
        accepts: [
            { arg: 'targetId', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' },
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Block.remoteMethod('getBlockList', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Block.remoteMethod('removeBlock', {
        http: { verb: 'post' },
        accepts: [
            { arg: 'targetId', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Block.addBlock = addBlock;
    Block.getMemberIdBlockMeList = getMemberIdBlockMeList;
    Block.getMemberIdBlockList = getMemberIdBlockList;
    Block.getExcludeBlock = getExcludeBlock;
    Block.getBlockList = getBlockList;
    Block.removeBlock = removeBlock;

    function addBlock(targetId, options, cb) {

        var token = options.accessToken;
        var userId = token.userId;

        var dateNow = new Date();

        var newBlock = {
            memberId: userId,
            targetId: targetId,
            createdAt: dateNow,
            createdBy: userId,
            updatedAt: dateNow,
            updatedBy: userId
        }

        Block.create(newBlock, function (error, result) {
            if (error) {
                return cb(error);
            }
            return cb(null, result);
        });
    }

    function getMemberIdBlockList(options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            fileds: ['targetId'],
            where: {
                memberId: userId
            }
        }

        Block.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            var memberIdList = [];
            result.forEach(function (item) {
                memberIdList.push(item.targetId);
            }, this);

            return cb(null, memberIdList);
        });

    }

    function getMemberIdBlockMeList(options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            fields: ['memberId'],
            where: {
                targetId: userId
            }
        }

        Block.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            var memberIdList = [];
            result.forEach(function (item) {
                memberIdList.push(item.memberId);
            }, this);

            return cb(null, memberIdList);
        });

    }

    function getBlockList(limit, offset, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            fields: ['targetId'],
            where: {
                memberId: userId
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
                        'bday'
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
            },
            limit: limit,
            skip: offset,
            order: 'createdAt DESC'
        }

        Block.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            var blockList = [];
            result.forEach(function (item) {
                if ('members' in item) {

                    item = JSON.parse(JSON.stringify(item));

                    var memberData = item.members;

                    if (typeof memberData !== 'undefined') {
                        memberData.hobby = JSON.parse(memberData.hobby);

                        var bdayDate = new Date(memberData.bday);
                        memberData.age = common.calculateAge(bdayDate);

                        blockList.push(memberData);
                    }


                }
            }, this);

            return filterPrivacy.apply(userId, blockList, function (error, result) {
                if (error) {
                    return cb(error);
                }
                return cb(null, result);
            });

        });

    }

    function removeBlock(targetId, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var dateNow = new Date();

        var where = {
            memberId: userId,
            targetId: targetId
        }

        var data = {
            deletedAt: dateNow,
            deletedBy: userId
        }

        Block.updateAll(where, data, function (error, result) {
            if (error) {
                return cb(error);
            }
            return cb(null, result);
        });


    }

    function getExcludeBlock(options, cb) {
        var funcList = [];
        funcList.push(getMemberIdBlockList);
        funcList.push(getMemberIdBlockMeList);

        var memberIdList = [];

        common.asyncLoop(funcList.length, function (loop) {
            var index = loop.iteration();
            var item = funcList[index];

            item(options, function (error, result) {
                if (error) {
                    return cb(error);
                }
                memberIdList = memberIdList.concat(result);
                loop.next();
            })


        }, function () {
            return cb(null, memberIdList);
        })

    }

};
