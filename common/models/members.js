'use strict';

var loopback = require("loopback");
var path = require('path');
var moment = require('moment');
var config = require('../../server/config.json');
var lodash = require('lodash');

module.exports = function (Members) {

    var app = require('../../server/server');
    var common = require('../common-util.js');

    // BEGIN BEFORE REMOTE ==================================================================

    // END BEFORE REMOTE ====================================================================

    // BEGIN AFTER REMOTE ===================================================================

    Members.beforeRemote('create', function (context, user, next) {
        var dateNow = new Date();
        context.args.data.createdAt = dateNow;
        next();
    });

    // Members.afterRemote('register', function (context, remoteMethodOutput, next) {
    //     var Role = Members.app.models.Role;
    //     var RoleMapping = Members.app.models.RoleMapping;

    //     Role.findOne({
    //         where: { name: 'admin' }
    //     }, function (err, role) {
    //         if (err) {
    //             cb(err);
    //             return;
    //         }

    //         RoleMapping.create({
    //             principalType: RoleMapping.USER,
    //             principalId: remoteMethodOutput.id,
    //             roleId: role.id
    //         }, function (err, roleMapping) {
    //             if (err) next(err);

    //             next();
    //         });
    //     });
    // });

    Members.afterRemote('register', function (context, userInstance, next) {
        //init verify status
        var app = require('../../server/server');
        var Memberverifystatus = app.models.MemberVerifyStatus;
        var Members = app.models.Members;

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
        next();

        // // Send mail
        // var mailFrom = Members.app.dataSources.pmjemail.settings.transports[0].auth.user;

        // // Send verify email
        // var url = config.remoteHost + '/api/Members/confirm?uid=' + userInstance.id + '&redirect=/verified';
        // var options = {
        //     type: 'email',
        //     to: userInstance.email,
        //     from: mailFrom,
        //     subject: 'Thanks for registering.',
        //     template: path.resolve(__dirname, '../views/verify.ejs'),
        //     user: Members,
        //     verifyHref: url,
        //     dateNow: moment().format('DD/MM/YYYY'),
        //     fullName: userInstance.fullName
        // };
        // userInstance.verify(options, function (err, response, nexts) {
        //     console.log(err, 'Error send email');
        //     if (err) {
        //         return next(err);
        //     }

        //     Members.updateById(userInstance.id, {
        //         emailSent: 1
        //     }, function (error, result) {
        //         if (error) {
        //             return next(err);
        //         }

        //         next();
        //     });

        //     console.log('> verification email sent:', response);
        //     // next();
        // });
    });

    Members.afterRemote('login', function (ctx, modelInstance, next) {

        var userId = modelInstance.userId;
        if (userId != 1) {


            var filter = {
                fields: [
                    'id',
                    'email',
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
                    'updatedAt'
                ],
                include: [{
                    relation: 'memberPhotos',
                    scope: {
                        fields: ['src']
                    }
                }, {
                    relation: 'memberImage',
                    scope: {
                        fields: ['id', 'src']
                    }
                }, {
                    relation: 'settingHomes',
                    scope: {
                        fields: [
                            'religion',
                            'ageLower',
                            'ageUpper',
                            'zodiac',
                            'visibility',
                            'distance',
                            'smoke',
                            'income',
                            'verify'
                        ]
                    }
                }]
            }

            Members.findById(userId, filter, function (error, result) {

                if (error) {
                    var memberData = null;
                    // throw error;
                } else {
                    var memberData = JSON.parse(JSON.stringify(result));
                    memberData['hobby'] = JSON.parse(memberData['hobby']);

                    var bdayDate = new Date(memberData['bday']);
                    memberData['age'] = common.calculateAge(bdayDate);


                    memberData['settingHomes'].religion = JSON.parse(memberData['settingHomes'].religion);
                    memberData['settingHomes'].zodiac = JSON.parse(memberData['settingHomes'].zodiac);


                }
                var settingHome = JSON.parse(JSON.stringify(memberData['settingHomes']));
                delete memberData['settingHomes'];

                modelInstance['memberData'] = memberData;
                modelInstance['settingHome'] = settingHome;
                next();
            });

        } else {
            next();
        }
    });

    Members.beforeRemote('login', function (ctx, userInstance, next) {
        var email = ctx.args.credentials.email;
        Members.findOne({
            where: { email: email },
            fields: { emailVerified: true }
        }, function (error, result) {
            if (error) {
                next(error);
            }
            if (result) {
                if (result.emailVerified == 1) {
                    next();
                } else {
                    next({
                        message: 'Please verify your email address',
                        name: 'Error',
                        statusCode: 403
                    });
                }
            } else {
                next();
            }

        });
    });

    // END AFTER REMOTE =====================================================================

    // BEGIN REMOTE METHOD ==================================================================

    Members.remoteMethod('updateById', {
        http: { path: '/:id/updateById', verb: 'post' },
        accepts: [
            { arg: 'id', type: 'number' },
            { arg: 'param', type: 'object' }
        ],
        returns: { arg: 'respon', type: 'object', root: true }
    });

    Members.remoteMethod('newLogin', {
        http: { path: '/newLogin', verb: 'post' },
        accepts: { arg: 'email', type: 'string', required: true },
        returns: { arg: 'respon', type: 'object', root: true }
    });

    Members.remoteMethod('onlineOffline', {
        http: { path: '/:id/onlineOffline', verb: 'post' },
        accepts: [
            { arg: 'id', type: 'number' },
            { arg: 'param', type: 'object' }
        ],
        returns: { arg: 'respon', type: 'object', root: true }
    });

    Members.remoteMethod('statistic', {
        http: { path: '/statistic', verb: 'get' },
        accepts: [
            { arg: 'params', type: 'object' }
        ],
        returns: { arg: 'respon', type: 'object', root: true }
    });

    Members.remoteMethod('register', {
        http: { path: '/register', verb: 'post' },
        accepts: { arg: 'params', type: 'object', required: true },
        returns: { arg: 'result', type: 'object', root: true }
    });

    Members.remoteMethod('isSocialRegistered', {
        accepts: [
            { arg: 'socialId', type: 'string', required: true },
            { arg: 'loginWith', type: 'string', required: true }
        ],
        returns: { arg: 'result', type: 'boolean' }
    });

    // Members.remoteMethod('confirm', {
    //     description: 'Confirm a user registration with email verification token.',
    //     accepts: [
    //         { arg: 'uid', type: 'string', required: true },
    //         { arg: 'token', type: 'string', required: true },
    //         { arg: 'redirect', type: 'string' },
    //         { arg: 'res', type: 'object', http: { source: 'res' } }
    //     ],
    //     http: { verb: 'get', path: '/confirm' },
    // });

    Members.remoteMethod('passwordReset', {
        http: { path: '/passwordReset', verb: 'post' },
        accepts: { arg: 'param', type: 'Object', required: true },
        returns: { arg: 'respon', type: 'Object', root: true }
    });

    Members.remoteMethod('emailCheck', {
        http: { path: '/emailCheck', verb: 'post' },
        accepts: { arg: 'param', type: 'Object', required: true },
        returns: { arg: 'respon', type: 'Object', root: true }
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

    Members.remoteMethod('updateProfile', {
        description: 'Update Profile',
        http: { verb: 'post' },
        accepts: [
            { arg: 'userId', type: 'number', required: true },
            { arg: 'params', type: 'object', required: true }
        ],
        returns: { arg: 'result', type: 'object', root: true, description: 'new Member data' }
    });

    Members.remoteMethod('deleteAccount', {
        description: 'Delete Account',
        http: { path: '/deleteAccout', verb: 'get' },
        accepts: { arg: 'userId', type: 'number', required: true },
        returns: { arg: 'respon', type: 'object', root: true }
    });

    Members.remoteMethod('generateAlias', {
        http: { verb: 'get' },
        accepts: { arg: 'options', type: 'object', http: 'optionsFromRequest' },
        returns: { arg: 'result', type: 'object', root: true }
    });

    Members.remoteMethod('adminLogin', {
        http: { verb: 'post' },
        accepts: [
            { arg: 'email', type: 'string', required: true },
            { arg: 'password', type: 'string', required: true }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Members.remoteMethod('getMemberList', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Members.remoteMethod('getUserData', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'updateDate', type: 'string' },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Members.remoteMethod('search', {
        http: { verb: 'post' },
        accepts: { arg: 'search', type: 'string', required: true },
        returns: { arg: 'result', type: 'object', root: true }
    });

    // BADMIN
    Members.remoteMethod('getDetailMember', {
        http: { verb: 'post' },
        accepts: {
            arg: 'params',
            type: 'object',
            required: true
        },
        returns: { arg: 'params', type: 'object', root: true }
    });

    Members.remoteMethod('updateMember', {
        http: { verb: 'post' },
        accepts: {
            arg: 'params',
            type: 'object',
            required: true
        },
        returns: { arg: 'params', type: 'object', root: true }
    });

    Members.remoteMethod('getPendingEmail', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' },
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Members.remoteMethod('adminApproveEmail', {
        http: { path: '/adminApproveEmail/:id', verb: 'get' },
        accepts: [
            { arg: 'id', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' },
        ],
        returns: { arg: 'result', type: 'object', root: true }
    })

    // END REMOTE METHOD ====================================================================

    // BEGIN LIST OF FUNCTION ===============================================================

    Members.updateById = updateById;
    Members.newLogin = newLogin;
    Members.onlineOffline = onlineOffline;
    Members.statistic = statistic;
    Members.register = register;
    Members.isSocialRegistered = isSocialRegistered;
    // Members.confirm = confirm;
    Members.passwordReset = passwordReset;
    Members.emailCheck = emailCheck;
    Members.isUserNeedProfile = isUserNeedProfile;
    Members.updateProfile = updateProfile;
    Members.deleteAccount = deleteAccount;
    Members.generateAlias = generateAlias;
    Members.adminLogin = adminLogin;
    Members.getMemberList = getMemberList;
    Members.getUserData = getUserData;
    Members.search = search;
    Members.getDetailMember = getDetailMember;
    Members.updateMember = updateMember;
    Members.getPendingEmail = getPendingEmail;
    Members.adminApproveEmail = adminApproveEmail;

    // END LIST OF FUNCTION =================================================================

    function updateById(id, param, cb) {
        param['deletedAt'] = null;
        Members.upsertWithWhere({ id: id }, param, function (err, result) {
            if (err) {
                cb(null, err);
                return;
            }
            // if (param.status == 1) {
            //     console.log('SEND NOTIF TO USER');
            //     var app = require('../../server/server');
            //     var Devicetokenmapping = app.models.Devicetokenmapping;
            //     Members.findOne({
            //         where: {
            //             id: id
            //         }
            //     }, function (error, result) {
            //         var fullName = '';
            //         if (result) {
            //             fullName = result.fullName;
            //         }
            //         Devicetokenmapping.getUserToken(id, function (error, result) {
            //             var tokens = [];
            //             tokens.push(result);
            //             var message = {
            //                 app_id: '7e0eb180-9d56-4823-8d89-387c06ae97fd',
            //                 contents: { en: 'Hi ' + fullName + ', your account has been Activated' },
            //                 include_player_ids: tokens
            //             };
            //             sendNotification(message, 'ZTNlMGFiOGMtZTk2Yy00OTUxLTkyOWUtNTllNmNmZTE3OTRm');

            //         })

            //     })
            // }
            cb(null, result);
        });
    }

    function newLogin(email, cb) {
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

    function onlineOffline(id, online, cb) {
        // var socket = Members.app.io;
        online['lastOnline'] = new Date();

        Members.upsertWithWhere({ id: id }, online, function (err, result) {
            if (err) {
                cb(err);
                return;
            }

            // socket.emit('online-' + id, result);
            Members.app.mx.IO.emit('online-' + id, result);
            cb(null, result);
        });
    }

    function statistic(params, cb) {
        var ds = Members.dataSource;
        if (params.flag == 0) {
            var sql = "SELECT a.registered, b.male, c.female, d.active, e.inactive, f.matches " +
                "FROM (" +
                "(SELECT COUNT(id) AS registered FROM pmjakarta.Members WHERE created_at is not null) AS a, " +
                "(SELECT COUNT(gender) AS male FROM pmjakarta.Members WHERE gender = 0) AS b, " +
                "(SELECT COUNT(gender) AS female FROM pmjakarta.Members WHERE gender = 1) AS c, " +
                "(SELECT COUNT(status) AS active FROM pmjakarta.Members WHERE status = 1) AS d, " +
                "(SELECT COUNT(status) AS inactive FROM pmjakarta.Members WHERE status = 0) AS e, " +
                "(SELECT COUNT(id) AS matches FROM pmjakarta.Match_member) AS f)";
        } else {
            var sql = "SELECT a.registered, b.male, c.female, d.active, e.inactive, f.matches " +
                "FROM (" +
                "(SELECT COUNT(id) AS registered FROM pmjakarta.Members WHERE created_at is not null AND created_at BETWEEN  '" + params.from + "' AND '" + params.to + "' ) AS a, " +
                "(SELECT COUNT(gender) AS male FROM pmjakarta.Members WHERE gender = 0 AND created_at BETWEEN '" + params.from + "' AND '" + params.to + "' ) AS b, " +
                "(SELECT COUNT(gender) AS female FROM pmjakarta.Members WHERE gender = 1 AND created_at BETWEEN '" + params.from + "' AND '" + params.to + "' ) AS c, " +
                "(SELECT COUNT(status) AS active FROM pmjakarta.Members WHERE status = 1 AND created_at BETWEEN '" + params.from + "' AND '" + params.to + "' ) AS d, " +
                "(SELECT COUNT(status) AS inactive FROM pmjakarta.Members WHERE status = 0 AND created_at BETWEEN '" + params.from + "' AND  '" + params.to + "' ) AS e, " +
                "(SELECT COUNT(id) AS matches FROM pmjakarta.Match_member WHERE update_date BETWEEN '" + params.from + "' AND  '" + params.to + "') AS f)";
        }
        ds.connector.execute(sql, function (err, result) {
            if (err) {
                cb(err);
                return;
            }

            cb(null, result);
        });
    }

    function register(params, cb) {
        Members.beginTransaction({
            isolationLevel: Members.Transaction.READ_COMMITTED
        }, function (error, tx) {
            var memberData = {};

            var dateNow = new Date();
            params.createdAt = dateNow;
            params.updatedAt = dateNow;

            var randomNum = Math.random();
            var expectedNum = Math.floor(randomNum * 100000);
            var stringNum = ('0000' + expectedNum).slice(-5);
            params.alias = stringNum;

            Members.create(params, function (error, result) {
                if (error) {
                    return tx.rollback(function (err) {
                        if (err) {
                            return cb(err);
                        }
                        return cb(error);
                    });
                }

                memberData = result;

                var inits = [];
                inits.push(initSettingHome);
                inits.push(initSettingPrivacy);

                common.asyncLoop(inits.length, function (loop) {
                    var index = loop.iteration();
                    var item = inits[index];
                    item(result.id, function () {
                        loop.next();
                    })
                }, function () {
                    return tx.commit(function (err) {
                        if (err) {
                            return cb(err);
                        }
                        return cb(null, result);
                    })
                });
            });

            function initSettingHome(userId, callback) {
                var Settinghome = app.models.SettingHome;

                var dateNow = new Date();
                var ageLower = 21;
                var ageUpper = 100;

                if (memberData['bday']) {
                    var bdayDate = new Date(memberData['bday']);
                    var age = common.calculateAge(bdayDate);
                    ageLower = age - 20;
                    ageUpper = age + 20;
                    if (ageLower < 21) {
                        ageLower = 21;
                    }
                    if (ageUpper > 60) {
                        ageUpper = 60;
                    }
                }

                Settinghome.create({
                    memberId: userId,
                    ageLower: ageLower,
                    ageUpper: ageUpper,
                    createUserId: userId,
                    createDatetime: dateNow,
                    updateUserId: userId,
                    updateDatetime: dateNow
                }, { transaction: tx }, function (error, result) {
                    if (error) {
                        return tx.rollback(function (err) {
                            if (err) {
                                return cb(err);
                            }
                            return cb(error);
                        });
                    } else {
                        callback();
                    }
                })


            }

            function initSettingPrivacy(userId, callback) {

                var Visibilitydata = app.models.VisibilityData;

                common.asyncLoop(5, function (loop) {
                    var index = loop.iteration();
                    if (index == 1) {
                        var item = {
                            unverified: 0,
                            verified: 1,
                            match: 1,
                            membersId: userId,
                            filterId: index + 1,
                        }
                    } else if (index == 2 || index == 3) {
                        var item = {
                            unverified: 0,
                            verified: 0,
                            match: 1,
                            membersId: userId,
                            filterId: index + 1,
                        }
                    } else {
                        var item = {
                            unverified: 0,
                            verified: 0,
                            match: 0,
                            membersId: userId,
                            filterId: index + 1,
                        }
                    }
                    Visibilitydata.create(item, { transaction: tx }, function (error, result) {
                        if (error) {
                            return tx.rollback(function (err) {
                                if (err) {
                                    return cb(err);
                                }
                                return cb(error);
                            })
                        }
                        loop.next();
                    })
                }, function () {
                    callback();
                })

            }
        })

        // var memberData = {};

        // var dateNow = new Date();
        // params.createdAt = dateNow;

        // Members.create(params, function (error, result) {
        //     if (error) {
        //         cb(error);
        //     }

        //     memberData = result;

        //     var inits = [];
        //     inits.push(initSettingHome);
        //     inits.push(initSettingPrivacy);

        //     common.asyncLoop(inits.length, function (loop) {
        //         var index = loop.iteration();
        //         var item = inits[index];
        //         item(result.id, function () {
        //             loop.next();
        //         })
        //     }, function () {
        //         cb(null, result);
        //     });
        // });

        // function initSettingHome(userId, callback) {
        //     var Settinghome = app.models.SettingHome;

        //     var dateNow = new Date();
        //     var ageLower = 21;
        //     var ageUpper = 100;

        //     if (memberData['bday']) {
        //         var bdayDate = new Date(memberData['bday']);
        //         var age = common.calculateAge(bdayDate);
        //         ageLower = age - 20;
        //         ageUpper = age + 20;
        //         if (ageLower < 21) {
        //             ageLower = 21;
        //         }
        //         if (ageUpper > 60) {
        //             ageUpper = 60;
        //         }
        //     }

        //     Settinghome.create({
        //         memberId: userId,
        //         ageLower: ageLower,
        //         ageUpper: ageUpper,
        //         createUserId: userId,
        //         createDatetime: dateNow,
        //         updateUserId: userId,
        //         updateDatetime: dateNow
        //     }, function (error, result) {
        //         if (error) {
        //             cb(error);
        //         } else {
        //             callback();
        //         }
        //     })


        // }

        // function initSettingPrivacy(userId, callback) {

        //     var Visibilitydata = app.models.VisibilityData;

        //     common.asyncLoop(5, function (loop) {
        //         var index = loop.iteration();
        //         if (index == 1) {
        //             var item = {
        //                 unverified: 0,
        //                 verified: 1,
        //                 match: 1,
        //                 membersId: userId,
        //                 filterId: index + 1,
        //             }
        //         } else if (index == 2 || index == 3) {
        //             var item = {
        //                 unverified: 0,
        //                 verified: 0,
        //                 match: 1,
        //                 membersId: userId,
        //                 filterId: index + 1,
        //             }
        //         } else {
        //             var item = {
        //                 unverified: 0,
        //                 verified: 0,
        //                 match: 0,
        //                 membersId: userId,
        //                 filterId: index + 1,
        //             }
        //         }
        //         Visibilitydata.create(item, function (error, result) {
        //             if (error) {
        //                 cb(error);
        //             }
        //             loop.next();
        //         })
        //     }, function () {
        //         callback();
        //     })

        // }
    }

    function isSocialRegistered(socialId, loginWith, cb) {
        Members.find({
            where: {
                and: [
                    { socialId: socialId },
                    { loginWith: loginWith }
                ]
            }
        }, function (error, members) {
            var result = false;
            if (members.length > 0) { //sudah diregister
                result = true;
            }
            cb(null, result);
        })
    }

    function passwordReset(param, cb) {
        Members.resetPassword(param, function (err, result) {
            if (err) return cb(err)

            cb(null, {
                success: "success"
            });
        });
    }

    // by-jeje check email 
    function emailCheck(param, cb) {
        Members.find({
            where: {
                email: param.email
            }
        }, function (err, req) {
            if (err) {
                cb(null, []);
            } else {
                cb(null, req);
            }
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

    function isUserNeedProfile(userId, cb) {

        //MAX VALUE IS 14. IF USER < 14 then return TRUE
        var query = '';
        query = query.concat(' SELECT B.id, SUM(value) AS \'value\' FROM ( ')
            .concat(' SELECT A.id, \'religion\' AS \'key\', ')
            .concat(' IF(A.religion IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'industry\' AS \'key\', ')
            .concat(' IF(A.industry IS NULL, 0, 1) AS \'value\' ')
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
            .concat(' SELECT A.id, \'smoke_detail\' AS \'key\', ')
            .concat(' IF(A.smoke_detail IS NULL, 0, 1) AS \'value\' ')
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
            .concat(' SELECT A.id, \'kids\' AS \'key\', ')
            .concat(' IF(A.kids IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'degree\' AS \'key\', ')
            .concat(' IF(A.degree IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'address\' AS \'key\', ')
            .concat(' IF(A.address IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'zodiac\' AS \'key\', ')
            .concat(' IF(A.zodiac IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'about\' AS \'key\', ')
            .concat(' IF(A.about IS NULL, 0, 1) AS \'value\' ')
            .concat(' FROM Members A ')
            .concat(' UNION ')
            .concat(' SELECT A.id, \'employee_type\' AS \'key\', ')
            .concat(' IF(A.employee_type IS NULL, 0, 1) AS \'value\' ')
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
                if (count < 14) {
                    cb(null, true);
                } else {
                    cb(null, false);
                }
            }
        });
    }

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

            });
        });

        req.on('error', function (e) {
            console.log("ERROR:");
            console.log(e);
        });

        req.write(JSON.stringify(data));
        req.end();
    };

    function updateProfile(userId, params, cb) {
        var where = {
            id: userId
        }

        // SPECIAL CHARACTER HANDLER
        if ('address' in params) {
            params['address'] = decodeURIComponent(params['address']);
        }

        if ('about' in params) {
            params['about'] = decodeURIComponent(params['about']);
        }

        params['updatedAt'] = new Date();

        Members.upsertWithWhere(where, params, function (error, result) {
            if (error) {
                cb(error);
            }
            getMemberData();
        });

        function getMemberData() {
            var filter = {
                fields: [
                    'id',
                    'email',
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
            Members.findById(userId, filter, function (error, result) {
                if (error) {
                    cb(error);
                }
                var memberData = JSON.parse(JSON.stringify(result));
                memberData['hobby'] = JSON.parse(memberData['hobby']);

                var bdayDate = new Date(memberData['bday']);
                memberData['age'] = common.calculateAge(bdayDate);

                cb(null, memberData);
            });

        }
    }

    function deleteAccount(userId, cb) {
        var app = require('../../server/server');
        var accessToken = app.models.AccessToken;

        Members.upsertWithWhere({
            id: userId
        }, {
                deletedAt: new Date()
            }, function (error, result) {
                if (error) {
                    cb(error);
                }
                deleteAccount();
            });

        function deleteAccount() {
            accessToken.destroyAll({
                userId: userId
            }, function (error, result) {
                if (error) {
                    cb(error);
                }

                cb(null, result);
            });
        }
    }

    function generateAlias(options, cb) {

        var filter = {
            where: {
                alias: null
            }
        }

        Members.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }

            common.asyncLoop(result.length, function (loop) {
                var index = loop.iteration();
                var item = result[index];

                var where = {
                    id: item.id
                }

                var randomNum = Math.random();
                var expectedNum = Math.floor(randomNum * 100000);
                var stringNum = ('0000' + expectedNum).slice(-5);

                var newValue = {
                    alias: stringNum
                }

                Members.updateAll(where, newValue, function (error, result) {
                    if (error) {
                        return cb(error);
                    }
                    return loop.next();
                });

            }, function () {
                return cb(null, {
                    status: 'OK'
                });

            })

        })



    }

    function adminLogin(email, password, cb) {
        if (email != 'admin@flutterasia.com') {
            return cb({
                name: 'user.not.authorized',
                status: 404,
                message: 'You dont have authorization for Admin'
            });
        } else {
            return cb(null, {});
        }
    }

    function getMemberList(limit, offset, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        // 1 is ADMIN ID,
        if (userId != 1) {
            return cb({
                name: 'user.not.authorized',
                status: 404,
                message: 'You dont have authorization for Admin'
            });
        } else {
            var filter = {
                fields: [
                    'id',
                    'fullName',
                    'email',
                    'phone',
                    'gender',
                    'bday',
                    'updatedAt'
                ],
                include: [
                    {
                        relation: 'memberPhotos',
                        scope: {
                            fields: [
                                'src'
                            ]
                        }
                    }
                ],
                limit: limit,
                skip: offset,
                order: 'createdAt DESC',
            }
            return Members.find(filter, function (error, result) {
                if (error) {
                    return cb(error);
                }

                var newResult = [];
                result.forEach(function (item) {
                    var temp = JSON.parse(JSON.stringify(item));
                    var newItem = {
                        memberId: temp.id,
                        fullName: temp.fullName,
                        avatarImg: (temp.memberPhotos ? temp.memberPhotos.src : null),
                        email: temp.email,
                        phone: temp.phone,
                        gender: temp.gender,
                        bday: temp.bday,
                        updatedAt: temp.updatedAt
                    }
                    newResult.push(newItem);
                }, this);
                return cb(null, newResult);
            });
        }

    }

    function getUserData(updateDate, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            fields: ['updatedAt']
        };

        Members.findById(userId, filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            if (result.updatedAt) {
                if (new Date(updateDate) < new Date(result.updatedAt) || typeof updateDate === 'undefined') {
                    filter = {
                        fields: [
                            'id',
                            'email',
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
                            'updatedAt'
                        ],
                        include: [{
                            relation: 'memberPhotos',
                            scope: {
                                fields: ['src']
                            }
                        }, {
                            relation: 'memberImage',
                            scope: {
                                fields: ['id', 'src']
                            }
                        }, {
                            relation: 'settingHomes',
                            scope: {
                                fields: [
                                    'religion',
                                    'ageLower',
                                    'ageUpper',
                                    'zodiac',
                                    'visibility',
                                    'distance',
                                    'smoke',
                                    'income',
                                    'verify'
                                ]
                            }
                        }]
                    }

                    Members.findById(userId, filter, function (error, result) {

                        if (error) {
                            return cb(error);
                            // throw error;
                        }
                        var memberData = JSON.parse(JSON.stringify(result));
                        memberData['hobby'] = JSON.parse(memberData['hobby']);

                        var bdayDate = new Date(memberData['bday']);
                        memberData['age'] = common.calculateAge(bdayDate);

                        memberData['settingHomes'].religion = JSON.parse(memberData['settingHomes'].religion);
                        memberData['settingHomes'].zodiac = JSON.parse(memberData['settingHomes'].zodiac);

                        var settingHome = JSON.parse(JSON.stringify(memberData['settingHomes']));
                        delete memberData['settingHomes'];

                        var newResult = {
                            memberData: memberData,
                            settingHome: settingHome
                        }

                        return cb(null, newResult);
                    });

                } else {
                    return cb({
                        name: 'there.is.no.new.update',
                        status: 404,
                        message: 'Updated User Data not found : ' + updateDate
                    });
                }
            }
        });

    }

    function search(text, cb) {
        var filter = {
            fields: ['id', 'fullName', 'email', 'gender', 'bday', 'phone', 'updatedAt'],
            where: {
                fullName: { like: '%' + text + '%' }
            },
            include: [{
                relation: 'memberPhotos',
                scope: {
                    fields: ['src']
                }
            }]
        };

        Members.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }

            var newResult = [];
            result.forEach(function (item) {
                var temp = JSON.parse(JSON.stringify(item));
                var newItem = {
                    memberId: temp.id,
                    fullName: temp.fullName,
                    avatarImg: (temp.memberPhotos ? temp.memberPhotos.src : null),
                    email: temp.email,
                    phone: temp.phone,
                    gender: temp.gender,
                    bday: temp.bday,
                    updatedAt: temp.updatedAt
                }
                newResult.push(newItem);
            }, this);

            cb(null, newResult);
        });
    }

    function getDetailMember(params, cb) {
        Members.findOne({
            where: { id: params.memberid }
        }, function (error, result) {
            if (error) {
                return cb(error);
            }

            cb(null, result);
        })
    }

    function updateMember(params, cb) {
        let data = params.data;
        console.log(params.dataid)
        Members.updateAll({
            id: params.dataid
        }, {
                fullName: data.txtFullName,
                email: data.txtEmail,
                gender: data.selGender,
                bday: data.selBday,
                phone: data.txtPhone
            }, function (error, req) {
                if (error) {
                    return cb(error);
                }

                cb(null, req);
            });
    }

    function getPendingEmail(limit, offset, options, cb) {
        var filter = {
            fields: ['id', 'fullName', 'gender', 'bday', 'email'],
            where: {
                emailVerified: null
            },
            include: {
                relation: 'memberPhotos',
                scope: {
                    fields: ['membersId', 'src', 'srcTmp'],
                }
            },
            limit: limit,
            skip: offset,
            order: 'updatedAt DESC'
        };

        Members.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }

            cb(null, result)
        });
    }

    function adminApproveEmail(id, options, cb) {
        Members.findById(id, function (error, result) {
            if (error) {
                return cb(error);
            }

            var updateAttr = {
                verificationToken: null,
                emailVerified: 1
            };

            result.updateAttributes(updateAttr, function (error, response) {
                if (error) {
                    return cb(error);
                }

                cb(null, response);
            });
        });
    }
};
