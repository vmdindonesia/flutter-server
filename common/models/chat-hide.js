'use strict';

module.exports = function (Chathide) {

    Chathide.remoteMethod('unhide', {
        http: { verb: 'post' },
        accepts: [
            { arg: 'memberId', type: 'number', required: true },
            { arg: 'matchId', type: 'number', required: true }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Chathide.remoteMethod('hide', {
        http: { verb: 'post' },
        accepts: [
            { arg: 'matchId', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Chathide.unhide = unhide;
    Chathide.hide = hide;
    Chathide.getHideList = getHideList;

    function unhide(memberId, matchId, cb) {
        var where = {
            memberId: memberId,
            matchId: matchId
        }
        Chathide.destroyAll(where, function (error, result) {
            if (error) {
                return cb(error);
            }
            cb(null, result);
        })
    }

    function hide(matchId, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var dateNow = new Date();

        var newChathide = {
            memberId: userId,
            matchId: matchId,
            createdAt: dateNow,
            updatedAt: dateNow
        }

        Chathide.create(newChathide, function (error, result) {
            if (error) {
                return cb(error);
            }
            return cb(null, result);
        });
    }

    function getHideList(options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            fields: ['matchId'],
            where: {
                memberId: userId
            }
        }
        Chathide.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            var hideMatchIdList = [];
            result.forEach(function (item) {
                hideMatchIdList.push(item['matchId'])
            }, this);
            return cb(null, hideMatchIdList)
        });



    }

};
