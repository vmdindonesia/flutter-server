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

    Members.remoteMethod('newLogin', {
        http: { path: '/newLogin', verb: 'post' },
        accepts: { arg: 'email', type: 'string', required: true },
        returns: { arg: 'respon', type: 'object',  root: true }
    });

    Members.newLogin = function(email, cb) {
        var app = require('../../server/server');
        var accessToken = app.models.AccessToken;
        
        // Check user already registered or not
        Members.findOne({
            where: { email: email },
            fields: { id: true }
        }, function(err, member) {
            if (err) {
                cb(err);
                return;
            }

            accessToken.destroyAll({
                userId: member.id 
            }, function(err, result) {
                if (err) {
                    cb(err);
                    return;
                }

                cb(null, result);
            });
        });

    }
};
