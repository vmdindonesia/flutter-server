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

    Members.remoteMethod('onlineOffline', {
        http: { path: '/:id/onlineOffline', verb: 'post' },
        accepts: [
            { arg: 'id', type: 'number' },
            { arg: 'param', type: 'object' }
        ],
        returns: { arg: 'respon', type: 'object', root: true }
    });

    Members.onlineOffline = function (id, online, cb) {
        var socket = Members.app.io;

        Members.upsertWithWhere({ id: id }, online, function (err, result) {
            if (err) {
                cb(err);
                return;
            }

            socket.emit('online-'+id, result);
            cb(null, result);
        });
    }

    Members.remoteMethod('statistic', {
        http: { path: '/statistic', verb: 'get' },
        returns: { arg: 'respon', type: 'object', root: true }
    });

    Members.statistic = function (cb) {
        var ds = Members.dataSource;
        var sql = "SELECT a.registered, b.male, c.female, d.active, e.inactive, f.matches " +
                   "FROM" +
                   "(SELECT COUNT(id) AS registered FROM pmjakarta.Members) AS a, " +
                   "(SELECT COUNT(gender) AS male FROM pmjakarta.Members WHERE gender = 0) AS b, " +
                   "(SELECT COUNT(gender) AS female FROM pmjakarta.Members WHERE gender = 1) AS c, " +
                   "(SELECT COUNT(status) AS active FROM pmjakarta.Members WHERE status = 1) AS d, " +
                   "(SELECT COUNT(status) AS inactive FROM pmjakarta.Members WHERE status = 0) AS e, " +
                   "(SELECT COUNT(id) AS matches FROM pmjakarta.Match_member) AS f";

        ds.connector.execute(sql, function(err, result) {
            if (err) {
                cb(err);
                return;
            }

            cb(null, result);
        });
    }

    Members.remoteMethod('register', {
        http: { path: '/register', verb: 'post' },
        accepts: { arg: 'param', type: 'object' },
        returns: { arg: 'respon', type: 'object', root: true }
    });

    Members.register = function (param, cb) {
        Members.create(param, function (err, member) {
            if (err) {
                cb(err);
                return;
            }

            cb(null, member);
        });
    }

    Members.afterRemote('register', function(context, remoteMethodOutput, next) {
        var Role = Members.app.models.Role;
        var RoleMapping = Members.app.models.RoleMapping;

        Role.findOne({
            where: { name: 'admin' }
        }, function (err, role) {
            if (err) {
                cb(err);
                return;
            }

            RoleMapping.create({
                principalType: RoleMapping.USER,
                principalId: remoteMethodOutput.id,
                roleId: role.id
            }, function (err, roleMapping) {
                if (err) next(err);

                next();
            });
        });
    });

    Members.isSocialRegistered = function (socialId, loginWith, cb) {
        Members.find({
            where: {
                and: [
                    { socialId: socialId },
                    { loginWith: loginWith }
                ]
            }
        }, function (error, members) {
            console.log('ERROR MEMBERS : ' + JSON.stringify(error, null, 2));
            console.log('MEMBERS RES : ' + JSON.stringify(members, null, 2));
            var result = false;
            if(members.length > 0){ //sudah diregister
                result = true;
            }
            cb(null, result);
        })
    }

    Members.remoteMethod('isSocialRegistered', {
        accepts: [
            { arg: 'socialId', type: 'string', required: true },
            { arg: 'loginWith', type: 'string', required: true }
        ],
        returns: { arg: 'result', type: 'boolean' }
    })

};
