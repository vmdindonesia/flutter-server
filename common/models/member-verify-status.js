'use strict';

module.exports = function (Memberverifystatus) {
    var app = require('../../server/server');
    var path = require('path');
    var moment = require('moment');
    var config = require('../../server/config.json');

    Memberverifystatus.beforeRemote('create', function (context, user, next) {
        var dateNow = new Date();
        context.args.data.createAt = dateNow;
        context.args.data.updateAt = dateNow;
        next();
    });

    Memberverifystatus.afterRemote('changeVerifyStatus', function (context, user, next) {
        var Members = app.models.Members;
        Members.findById(user.result.userId, function (error, result) {
            if (error) {
                console.log('ERROR : ' + error);
                next();
            } else {
                console.log('MEMBERS : ' + JSON.stringify(result));
                var message = {
                    app_id: '8267bba1-3ac6-421a-93fb-19e06ff97c79',
                    contents: { en: result.fullName + ' verify status changed' },
                    included_segments: ["All"]
                };
                sendNotification(message);
                next();
            }
        })
    });

    Memberverifystatus.afterRemote('getVerifyStatusByUserId', function (context, user, next) {
        var Memberphoto = app.models.MemberPhoto;
        Memberphoto.findOne({
            where: {
                membersId: user.result.userId
            }
        }, function (error, result) {
            if (result) {
                next();
            } else {
                Memberphoto.create({
                    membersId: user.result.userId,
                    src: 'init_first'
                });
                next();
            }
        })
    });

    Memberverifystatus.remoteMethod('isUserNeedVerify', {
        description: 'Check User need verify or not.',
        http: { verb: 'post' },
        accepts: [
            { arg: 'userId', type: 'number', required: true }
        ],
        returns: [
            { arg: 'result', type: 'boolean', description: 'result is true or false' }
        ]
    });

    Memberverifystatus.remoteMethod('getVerifyStatusByUserId', {
        accepts: { arg: 'userId', type: 'string', required: true },
        returns: [
            { arg: 'status', type: 'string' },
            { arg: 'result', type: 'object' },
            { arg: 'error', type: 'object' }
        ]
    });

    Memberverifystatus.remoteMethod('getVerifyScoreByUserId', {
        accepts: { arg: 'userId', type: 'string', required: true },
        returns: [
            { arg: 'status', type: 'string' },
            { arg: 'result', type: 'object' },
            { arg: 'error', type: 'object' }
        ]
    });

    Memberverifystatus.remoteMethod('changeVerifyStatus', {
        description: 'Changing MemberVerifyStatus value by User Id',
        http: { verb: 'post' },
        accepts: [
            { arg: 'userId', type: 'number', required: true },
            { arg: 'key', type: 'string', required: true },
            { arg: 'value', type: 'number', required: true }
        ],
        returns: [
            { arg: 'status', type: 'string' },
            { arg: 'result', type: 'object' },
            { arg: 'error', type: 'object' }
        ]

    });

    Memberverifystatus.remoteMethod('sendEmailVerification', {
        description: 'Sending Email for Verification',
        http: { verb: 'post' },
        accepts: [
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'status', type: 'boolean' }
    });

    Memberverifystatus.getVerifyStatusByUserId = getVerifyStatusByUserId;
    Memberverifystatus.getVerifyScoreByUserId = getVerifyScoreByUserId;
    Memberverifystatus.changeVerifyStatus = changeVerifyStatus;
    Memberverifystatus.isUserNeedVerify = isUserNeedVerify;
    Memberverifystatus.sendEmailVerification = sendEmailVerification;

    function getVerifyStatusByUserId(userId, cb) {
        var Members = app.models.Members;
        var filterMemberVerifyStatus = {
            where: {
                userId: userId
            }
        }
        Memberverifystatus.find(filterMemberVerifyStatus, function (error, result) {
            if (result.length > 0) {
                var verifyData = result[0];
                // Members.findById(userId, function (error, result) {
                //     if (error) {
                //         cb(error);
                //     } else if (result) {
                //         // var email = result.emailVerified;
                //         // if (email == null) {
                //         //     email = 0;
                //         // }
                //         // verifyData['email'] = email;
                //     } else {
                //         var error = {
                //             status: 404,
                //             message: 'Member Id not Found : ' + userId,
                //         }
                //         cb(error);
                //     }
                // })
                cb(null, 'OK', verifyData, {});
            } else {
                var error = {
                    code: 'member.id.not.found',
                    message: 'Member Id not Found : ',
                    value: userId
                }
                cb(null, 'FAIL', {}, error);
            }
        });
    }

    function getVerifyScoreByUserId(userId, cb) {
        var verifyRate = {
            phone: 20,
            ktp: 20,
            sim: 20,
            school_certificate: 20,
            passport: 20,
            business_card: 20
        }
        var filterMemberVerifyStatus = {
            where: {
                userId: userId
            }
        }
        // var query = 'SELECT * FROM ( ' +
        //     ' SELECT A.user_id, \'phone\' AS \'verify_key\', A.phone AS \'verify_value\' ' +
        //     ' FROM member_verify_status A UNION ' +
        //     ' SELECT A.user_id, \'ktp\' AS \'verify_key\', A.ktp AS \'verify_value\' ' +
        //     ' FROM member_verify_status A UNION ' +
        //     ' SELECT A.user_id, \'sim\' AS \'verify_key\', A.sim AS \'verify_value\' ' +
        //     ' FROM member_verify_status A UNION ' +
        //     ' SELECT A.user_id, \'school_certificate\' AS \'verify_key\', A.school_certificate AS \'verify_value\' ' +
        //     ' FROM member_verify_status A UNION ' +
        //     ' SELECT A.user_id, \'passport\' AS \'verify_key\', A.passport AS \'verify_value\' ' +
        //     ' FROM member_verify_status A UNION ' +
        //     ' SELECT A.user_id, \'business_card\' AS \'verify_key\', A.business_card AS \'verify_value\' ' +
        //     ' FROM member_verify_status A ' +
        //     ' ) B WHERE user_id = ? ';
        var query = ' SELECT countVerify(?) AS \'verify\' ';
        var params = [userId];

        Memberverifystatus.dataSource.connector.execute(query, params, function (error, result) {
            if (error) {
                return cb(error);
            }
            if (result.length > 0) {
                var score = result[0].verify;
                return cb(null, 'OK', score);
            }
            // if (result.length > 0) {
            //     var score = 0;
            //     for (var i = 0; i < result.length; i++) {
            //         var verifyKey = result[i].verify_key;
            //         var verifyValue = result[i].verify_value;
            //         if (verifyValue == 1) {
            //             score += verifyRate[verifyKey];
            //         }
            //     }
            //     if (score > 100) {
            //         score = 100;
            //     }
            //     cb(null, 'OK', score, {});
            // } else {
            //     var error = {
            //         code: 'member.id.not.found',
            //         message: 'Member Id not Found : ',
            //         value: userId
            //     }
            //     cb(null, 'FAIL', {}, error);
            // }

        });


    }

    function changeVerifyStatus(userId, key, value, cb) {
        var filter = {
            where: {
                userId: userId
            }
        }
        Memberverifystatus.find(filter, function (error, result) {
            if (error) {
                cb(null, 'FAIL', undefined, error);
            } else {
                var someData = result[0];
                someData[key] = value;
                someData['updateAt'] = new Date();
                Memberverifystatus.upsert(someData, function (error, result) {
                    if (error) {
                        cb(null, 'FAIL', undefined, error);
                    } else {
                        cb(null, 'OK', result);
                    }
                });
            }
        });
    }

    var sendNotification = function (data) {
        var headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": "Basic MDQzZTAwMmEtODczMi00M2Q4LWI1YjMtZDEzZmM2MzI2NzAy"
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

    function isUserNeedVerify(userId, cb) {

        var query = 'SELECT * FROM ( ' +
            ' SELECT A.user_id, \'phone\' AS \'verify_key\', A.phone AS \'verify_value\' ' +
            ' FROM member_verify_status A UNION ' +
            ' SELECT A.user_id, \'ktp\' AS \'verify_key\', A.ktp AS \'verify_value\' ' +
            ' FROM member_verify_status A UNION ' +
            ' SELECT A.user_id, \'sim\' AS \'verify_key\', A.sim AS \'verify_value\' ' +
            ' FROM member_verify_status A UNION ' +
            ' SELECT A.user_id, \'school_certificate\' AS \'verify_key\', A.school_certificate AS \'verify_value\' ' +
            ' FROM member_verify_status A UNION ' +
            ' SELECT A.user_id, \'passport\' AS \'verify_key\', A.passport AS \'verify_value\' ' +
            ' FROM member_verify_status A UNION ' +
            ' SELECT A.user_id, \'business_card\' AS \'verify_key\', A.business_card AS \'verify_value\' ' +
            ' FROM member_verify_status A ' +
            ' ) B WHERE user_id = ? ';
        var params = [userId];

        Memberverifystatus.dataSource.connector.execute(query, params, function (error, result) {
            if (error) {
                cb(error);
            } else {
                if (result.length <= 0) {
                    cb(null, true);

                } else {
                    var flag = true;
                    result.forEach(function (item) {
                        if (item.verify_value > 0) {
                            flag = false;
                        }
                    }, this);
                    cb(null, flag);
                }
            }
        });
    }

    function sendEmailVerification(options, cb) {
        var token = options.accessToken;
        if (token) {
            var userId = token.userId;
            var Members = app.models.Members;
            Members.findById(userId, function (error, result) {
                var userInstance = result;
                // Send mail
                var mailFrom = Members.app.dataSources.pmjemail.settings.transports[0].auth.user;

                // Send verify email
                var url = config.remoteHost + '/api/Members/confirm?uid=' + userInstance.id + '&redirect=/verified';
                var options = {
                    type: 'email',
                    to: userInstance.email,
                    from: "donotreply@flutterasia.com",
                    subject: 'Thanks for registering.',
                    template: path.resolve(__dirname, '../views/verify.ejs'),
                    user: Members,
                    verifyHref: url,
                    dateNow: moment().format('DD/MM/YYYY'),
                    fullName: userInstance.fullName
                };
                userInstance.verify(options, function (err, response, nexts) {
                    if (err) {
                        cb(err);
                    };

                    console.log('> verification email sent:', response);
                    // next();
                    cb(null, true);
                });

            })


        }




    }



};
