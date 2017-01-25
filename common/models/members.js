'use strict';

module.exports = function(Members) {
    Members.remoteMethod('updateById', {
        http: { path: '/:id/updateById', verb: 'post' },
        accepts: [
            { arg: 'id', type: 'number' },
            { arg: 'param', type: 'object' }
        ],
        returns: { arg: 'respon', type: 'object',  root: true }
    });

    Members.updateById = function(id, param, cb) {
        Members.upsertWithWhere({ id: id }, param, function (err, result) {
            if (err) {
                cb(null, err);
                return;
            }

            cb(null, result);
        });
    }
};
