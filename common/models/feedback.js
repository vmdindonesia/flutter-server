'use strict';

module.exports = function (Feedback) {

    var app = require('../../server/server');
    var lodash = require('lodash');

    Feedback.remoteMethod('addFeedback', {
        description: 'Add Feedback From User',
        http: { verb: 'post' },
        accepts: [
            { arg: 'message', type: 'string', required: true },
            { arg: 'appVersion', type: 'string', required: true },
            { arg: 'appPlatform', type: 'string', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Feedback.remoteMethod('isUserNeedFeedback', {
        description: 'Check is User need send feedback',
        http: { verb: 'get' },
        accepts: [
            { arg: 'appPlatform', type: 'string', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Feedback.remoteMethod('getPlatformList', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Feedback.addFeedback = addFeedback;
    Feedback.isUserNeedFeedback = isUserNeedFeedback;
    Feedback.getPlatformList = getPlatformList;

    function addFeedback(message, appVersion, appPlatform, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;
        var dateNow = new Date();

        var newFeedback = {
            memberId: userId,
            appVersion: appVersion,
            appPlatform: appPlatform,
            message: message,
            createdAt: dateNow
        }
        Feedback.create(newFeedback, function (error, result) {
            if (error) {
                return cb(error);
            }
            return cb(null, result);
        })


    }

    function isUserNeedFeedback(appPlatform, options, cb) {
        // var Appinfo = app.models.AppInfo;

        // Appinfo.getLatestVersion('android', function (error, result) {
        //     if (error) {
        //         return cb(error);
        //     }
        //     return cb(null, result);
        // })

        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            where: {
                memberId: userId
            }
        }
        Feedback.findOne(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            if (result) {
                return cb(null, false);
            } else {
                return cb(null, true)
            };
        });
    }

    function getPlatformList(options, cb) {

        var filter = {};
        return Feedback.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            result = JSON.parse(JSON.stringify(result));
            result = lodash.groupBy(result, 'appPlatform');
            result = lodash.mapValues(result, function (o) {
                var temp = undefined;
                var temp2 = undefined;
                temp = lodash.groupBy(o, 'appVersion');
                temp2 = [];
                lodash.forEach(temp, function (value, key) {
                    temp2.push(key);
                });
                return temp2;
            });

            return cb(null, result);



        })

    }

};
