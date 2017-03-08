'use strict';

module.exports = function (Memberverifystatus) {

    Memberverifystatus.beforeRemote('create', function (context, user, next) {
        var dateNow = new Date();
        context.args.data.createAt = dateNow;
        context.args.data.updateAt = dateNow;

        next();
    })

    Memberverifystatus.observe('before save', function (ctx, next) {
        var dateNow = new Date();
        if (ctx.instance) {
            ctx.instance.updateAt = dateNow;
        } else {
            ctx.data.updateAt = dateNow;
        }
        next();
    })

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

    Memberverifystatus.getVerifyStatusByUserId = function (userId, cb) {
        var filterMemberVerifyStatus = {
            where: {
                userId: userId
            }
        }
        Memberverifystatus.find(filterMemberVerifyStatus, function (error, result) {
            if (result.length > 0) {
                cb(null, 'OK', result[0], {});
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

    Memberverifystatus.getVerifyScoreByUserId = function (userId, cb) {
        var verifyRate = {
            phone: 25,
            ktp: 25,
            sim: 25,
            school_certificate: 25,
            passport: 25,
            business_card: 25
        }
        var filterMemberVerifyStatus = {
            where: {
                userId: userId
            }
        }
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
            console.log(result);
            if (result.length > 0) {
                var score = 0;
                for (var i = 0; i < result.length; i++) {
                    var verifyKey = result[i].verify_key;
                    var verifyValue = result[i].verify_value;
                    if (verifyValue == 1) {
                        score += verifyRate[verifyKey];
                    }
                }
                if (score > 100) {
                    score = 100;
                }
                cb(null, 'OK', score, {});
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

    Memberverifystatus.changeVerifyStatus = function (userId, key, value, cb) {
        var filter = {
            where: {
                userId: userId
            }
        }
        Memberverifystatus.find(filter, function (error, result) {
            var someData = result[0];
            someData[key] = value;
            Memberverifystatus.upsert(someData, function (error, result) {
                cb(null, 'OK', result);
            });
        });

    }



};
