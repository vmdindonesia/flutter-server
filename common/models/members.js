'use strict';

var loopback = require("loopback");
var path = require('path');
var moment = require('moment');
var config = require('../../server/config.json');

module.exports = function (Members) {
    Members.remoteMethod('updateById', {
        http: { path: '/:id/updateById', verb: 'post' },
        accepts: [
            { arg: 'id', type: 'number' },
            { arg: 'param', type: 'object' }
        ],
        returns: { arg: 'respon', type: 'object', root: true }
    });

    Members.updateById = function (id, param, cb) {
        Members.upsertWithWhere({ id: id }, param, function (err, result) {
            if (err) {
                cb(null, err);
                return;
            }
            if (param.status == 1) {
                console.log('SEND NOTIF TO USER');
                var app = require('../../server/server');
                var Devicetokenmapping = app.models.Devicetokenmapping;
                Members.findOne({
                    where: {
                        id: id
                    }
                }, function (error, result) {
                    var fullName = '';
                    if (result) {
                        fullName = result.fullName;
                    }
                    Devicetokenmapping.getUserToken(id, function (error, result) {
                        var tokens = [];
                        tokens.push(result);
                        var message = {
                            app_id: '7e0eb180-9d56-4823-8d89-387c06ae97fd',
                            contents: { en: 'Hi ' + fullName + ', your account has been Activated' },
                            include_player_ids: tokens
                        };
                        sendNotification(message, 'ZTNlMGFiOGMtZTk2Yy00OTUxLTkyOWUtNTllNmNmZTE3OTRm');

                    })

                })
            }
            cb(null, result);
        });
    }

    Members.remoteMethod('newLogin', {
        http: { path: '/newLogin', verb: 'post' },
        accepts: { arg: 'email', type: 'string', required: true },
        returns: { arg: 'respon', type: 'object', root: true }
    });

    Members.newLogin = function (email, cb) {
        var app = require('../../server/server');
        var accessToken = app.models.AccessToken;

        // Check user already registered or not
        Members.findOne({
            where: { email: email },
            fields: { id: true }
        }, function (err, member) {
            if (err) {
                cb(err);
                return;
            }

            accessToken.destroyAll({
                userId: member.id
            }, function (err, result) {
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

            socket.emit('online-' + id, result);
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

        ds.connector.execute(sql, function (err, result) {
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

    Members.afterRemote('register', function (context, remoteMethodOutput, next) {
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
            if (members.length > 0) { //sudah diregister
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
        //init verify status
        var app = require('../../server/server');
        var Memberverifystatus = app.models.MemberVerifyStatus;
        console.log('USER ID : ' + userInstance.id);
        var dateNow = new Date();
        Memberverifystatus.create({
            userId: userInstance.id,
            phone: 0,
            ktp: 0,
            sim: 0,
            schoolCertificate: 0,
            passport: 0,
            businessCard: 0,
            createAt: dateNow,
            updateAt: dateNow
        });


        //Send Notif
        var message = {
            app_id: '8267bba1-3ac6-421a-93fb-19e06ff97c79',
            contents: { en: userInstance.fullName + ' just join as new Member' },
            included_segments: ["All"]
        };
        sendNotification(message, 'MDQzZTAwMmEtODczMi00M2Q4LWI1YjMtZDEzZmM2MzI2NzAy');

        // Send mail
        // var myMessage = {
        //     dateNow: moment().format('DD/MM/YYYY'),
        //     fullName: userInstance.fullName
        // };

        // var renderer = loopback.template(path.resolve(__dirname, '../views/email-template-registration.ejs'));
        // var html_body = renderer(myMessage);
        var mailFrom = Members.app.dataSources.pmjemail.settings.transports[0].auth.user;

        // Members.app.models.Email.send({
        //     to: userInstance.email,
        //     from: mailFrom,
        //     subject: 'Thanks for registering',
        //     html: html_body
        // }, function (err, mail) {
        //     if (err) return next(err);

        //     console.log('email sent!');
        //     next();
        // });

        // Send verify email
        var url = config.remoteHost + 'api/Members/confirm?uid=' + userInstance.id + '&redirect=/';
        var options = {
            type: 'email',
            to: userInstance.email,
            from: mailFrom,
            subject: 'Thanks for registering.',
            template: path.resolve(__dirname, '../views/verify.ejs'),
            user: Members,
            verifyHref: url
        };
        userInstance.verify(options, function (err, response, nexts) {
            if (err) return next(err);

            console.log('> verification email sent:', response);
            next();
        });
    });

    var sendNotification = function (data, someAuth) {
        // var someAuth = 'Basic MDQzZTAwMmEtODczMi00M2Q4LWI1YjMtZDEzZmM2MzI2NzAy';
        // if (flag == true) {
        //     someAuth = 'Basic ZTNlMGFiOGMtZTk2Yy00OTUxLTkyOWUtNTllNmNmZTE3OTRm';
        // }

        var headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": "Basic " + someAuth
        };

        var options = {
            host: "onesignal.com",
            port: 443,
            path: "/api/v1/notifications",
            method: "POST",
            headers: headers
        };

        var https = require('https');
        var req = https.request(options, function (res) {
            res.on('data', function (data) {
                console.log("Response:");
                console.log(JSON.parse(data));
            });
        });

        req.on('error', function (e) {
            console.log("ERROR:");
            console.log(e);
        });

        req.write(JSON.stringify(data));
        req.end();
    };

    Members.remoteMethod('passwordReset', {
        http: { path: '/passwordReset', verb: 'post' },
        accepts: { arg: 'param', type: 'Object', required: true },
        returns: { arg: 'respon', type: 'Object', root: true }
    });

    Members.passwordReset = function (param, cb) {
        Members.resetPassword(param, function (err, result) {
            if (err) return cb(err)

            cb(null, {
                success: "success"
            });
        });
    }

    Members.on('resetPasswordRequest', function (info) {
        var url = config.remoteHost + '/reset-password?access_token=' + info.accessToken.id;

        // Send mail
        var data = {
            dateNow: moment().format('DD/MM/YYYY'),
            resetEmail: url
        };

        var renderer = loopback.template(path.resolve(__dirname, '../views/email-template-password.ejs'));
        var html_body = renderer(data);
        var mailFrom = Members.app.dataSources.pmjemail.settings.transports[0].auth.user;

        Members.app.models.Email.send({
            to: info.email,
            from: mailFrom,
            subject: 'Reset password request',
            html: html_body
        }, function (err, mail) {
            if (err) return next(err);

            console.log('email sent!');
        });
    });

    Members.remoteMethod('isUserNeedProfile', {
        description: 'Check User need fill profile or not.',
        http: { verb: 'post' },
        accepts: [
            { arg: 'userId', type: 'number', required: true }
        ],
        returns: [
            { arg: 'result', type: 'boolean', description: 'result is true or false' }
        ]
    });

    Members.isUserNeedProfile = function (userId, cb) {

        //MAV VALUE IS 9. IF USER < 9 then return TRUE
        var query = '';
        query = query.concat(' SELECT B.id, SUM(value) AS \'value\' FROM ( ')
            .concat(' SELECT A.id, \'phone\' AS \'key\', ')
            .concat(' IF(A.phone IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'religion\' AS \'key\', ')
            .concat(' IF(A.religion IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'profession\' AS \'key\', ')
            .concat(' IF(A.profession IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'income\' AS \'key\', ')
            .concat(' IF(A.income IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'living\' AS \'key\', ')
            .concat(' IF(A.living IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'smoke\' AS \'key\', ')
            .concat(' IF(A.smoke IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'race\' AS \'key\', ')
            .concat(' IF(A.race IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'marital_status\' AS \'key\', ')
            .concat(' IF(A.marital_status IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'hobby\' AS \'key\', ')
            .concat(' IF(A.hobby IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' ) B WHERE B.id = ? ')
            .concat(' GROUP BY B.id ');


        var params = [userId];

        Members.dataSource.connector.execute(query, params, function (error, result) {
            if (error) {
                cb(error);
            } else {
                var count = result[0].value;
                if (count < 9) {
                    cb(null, true);
                } else {
                    cb(null, false);
                }
            }
        });
    }
};
