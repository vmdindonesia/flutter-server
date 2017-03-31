'use strict';

module.exports = function (Settinghome) {

    Settinghome.beforeRemote('create', function (context, user, next) {
        var dateNow = new Date();
        var userId = context.req.accessToken.userId;
        context.args.data.createUserId = userId;
        context.args.data.createDatetime = dateNow;
        context.args.data.updateUserId = userId;
        context.args.data.updateDatetime = dateNow;
        next();
    })

    Settinghome.remoteMethod('registerSettingHome', {
        description: 'Registering Setting Home for Current Authorized User.',
        http: { verb: 'get' },
        accepts: { arg: 'options', type: 'object', http: 'optionsFromRequest' },
        returns: { arg: 'result', type: 'objec' }
    })

    Settinghome.registerSettingHome = function (options, cb) {
        var token = options.accessToken;
        var userId = token.userId;
        isUserRegistered(userId, manageSettingHome);

        function isUserRegistered(userId, callback) {
            console.log('START IS USER REGISTERED');
            Settinghome.findOne({
                where: {
                    memberId: userId
                }
            }, function (error, result) {
                if (error) {
                    cb(error);
                } else {
                    if (result) {
                        callback(userId, true, finalResult);
                    } else {
                        callback(userId, false, finalResult);
                    }
                }
            })
        }

        function manageSettingHome(userId, flag, callback) {
            console.log('START MANAGE SETTING HOME');
            if (flag) {
                //Jangan di APA2in
                callback(userId);
            } else {
                //create baru
                var dateNow = new Date();
                Settinghome.create({
                    memberId: userId,
                    createUserId: userId,
                    createDatetime: dateNow,
                    updateUserId: userId,
                    updateDatetime: dateNow
                }, function (error, result) {
                    if (error) {
                        cb(error);
                    } else {
                        callback(userId);
                    }
                })
            }
        }
        function finalResult(userId) {
            console.log('START FINAL RESULT');
            Settinghome.findOne({
                where: {
                    memberId: userId
                }
            }, function (error, result) {
                cb(null, result);
            })
        }
    }


};
