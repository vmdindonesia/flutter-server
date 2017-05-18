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

    Chathide.unhide = unhide;

    function unhide(memberId, matchId, cb) {
        var filter = {
            where: {
                memberId: memberId,
                matchId: matchId
            }
        }
        Chathide.destroyAll(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            cb(null, result);
        })
    }

};
