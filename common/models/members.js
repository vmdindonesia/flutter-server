'use strict';

var loopback = require("loopback");
var path = require('path');
var moment = require('moment');

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
    });

    Members.afterRemote('create', function (context, userInstance, next) {
        // Send mail
        var myMessage = {
            dateNow: moment().format('DD/MM/YYYY'),
            fullName: userInstance.fullName
        };

        var renderer = loopback.template(path.resolve(__dirname, '../views/email-template-registration.ejs'));
        var html_body = renderer(myMessage);
        var mailFrom = Members.app.dataSources.pmjemail.settings.transports[0].auth.user;

        Members.app.models.Email.send({
            to: userInstance.email,
            from: 'smdev77@gmail.com',
            subject: 'Test email from loopback',
            html: html_body
        }, function (err, mail) {
            if (err) return next(err);

            console.log('email sent!');
            next();
        });
    });

    Members.on('resetPasswordRequest', function (info) {
        console.log(info.email); // the email of the requested user
        console.log(info.accessToken.id); // the temp access token to allow password reset

        // requires AccessToken.belongsTo(User)
        info.accessToken.user(function (err, user) {
            console.log(user); // the actual user
        });
    });

    // Members.remoteMethod('resetPassword', {
    //     http: { path: '/reset', verb: 'get' },
    //     returns: { arg: 'respon', type: 'object', root: true }
    // });

    // Members.resetPassword = function (cb) {
    //     User.on('resetPasswordRequest', function (info) {
    //         console.log(info.email); // the email of the requested user
    //         console.log(info.accessToken.id); // the temp access token to allow password reset

    //         // requires AccessToken.belongsTo(User)
    //         info.accessToken.user(function (err, user) {
    //             if (err) return cb(err);

    //             console.log(user); // the actual user
    //             cb(user);
    //         });
    //     });
    // }
};
