'use strict';

module.exports = function (Dislikelist) {

    Dislikelist.remoteMethod('doDislike', {
        description: 'Add to Dislike List',
        http: { verb: 'post' },
        accepts: [
            { arg: 'userId', type: 'number', required: true, description: 'Id of user, who current user like' },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object' }
    });

    Dislikelist.doDislike = doDislike;
    Dislikelist.getDislikeMemberIdList = getDislikeMemberIdList;
    // begin
    Dislikelist.remoteMethod('doDislikeList', {
        description: 'View to Dislike List',
        http: { verb: 'post' },
        accepts: [
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object' }
    });
    Dislikelist.doDislikeList = doDislikeList;
    // end

    function doDislike(userId, options, cb) {
        var token = options.accessToken;
        var currentUserId = token.userId;
        var dislikedUserId = userId;

        var newDislike = {
            dislikeUser: currentUserId,
            dislikeMamber: dislikedUserId
        };

        Dislikelist.create(newDislike, function (error, result) {
            if (error) {
                cb(error);
            } else {
                cb(null, result);
            }
        });

    }

    function getDislikeMemberIdList(options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            fields: ['dislikeMamber'],
            where: {
                dislikeUser: userId
            }
        }
        Dislikelist.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            var dislikeMemberList = [];
            result.forEach(function (item) {
                dislikeMemberList.push(item.dislikeMamber);
            }, this);

            return cb(null, dislikeMemberList);

        });


    }

    function doDislikeList(limit, offset, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            fields: ['dislikeMamber'],
            where: {
                dislikeUser: userId
            },
            include: {
                relation: 'memberDisLike',
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
                        'alias',
                        'updatedAt'
                    ],
                    include: [{
                        relation: 'memberPhotos',
                        scope: {
                            fields: ['src']
                        }
                    }]
                }
            },
            limit: limit,
            skip: offset,
            order: 'id DESC'
        }
        Dislikelist.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            var dislikeList = [];

            result.forEach(function (item) {
                item = JSON.parse(JSON.stringify(item));
                dislikeList.push(item.memberDisLike);
            }, this);

            return cb(null, dislikeList);

        });

    }

};
