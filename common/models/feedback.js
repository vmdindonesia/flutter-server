'use strict';

module.exports = function (Feedback) {

    var app = require('../../server/server');

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

    Feedback.addFeedback = addFeedback;
    Feedback.isUserNeedFeedback = isUserNeedFeedback;

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

};
