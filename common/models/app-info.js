'use strict';

module.exports = function (Appinfo) {

    Appinfo.remoteMethod('getLatestVersion', {
        description: 'Get Latest Version of Flutter Asia by Platform',
        http: { verb: 'get' },
        accepts: { arg: 'platform', type: 'string' },
        returns: { arg: 'appVersion', type: 'string', root: true }
    });

    Appinfo.remoteMethod('addVersion', {
        description: 'Add Latest Version of Flutter Asia by Platform',
        http: { verb: 'post' },
        accepts: [
            { arg: 'platform', type: 'string' },
            { arg: 'version', type: 'string' }
        ],
        returns: { arg: 'appInfo', type: 'object', root: true }
    });

    Appinfo.getLatestVersion = getLatestVersion;
    Appinfo.addVersion = addVersion;

    function getLatestVersion(platform, cb) {

        var filter = {
            where: {
                appPlatform: platform
            },
            order: 'updateAt DESC'
        };

        Appinfo.findOne(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            if (result) {
                var appVersion = result.appVersion;
                return cb(null, appVersion);
            } else {
                return cb({
                    statusCode: 404,
                    message: 'Platform not found : ' + platform
                });
            }
        });

    }

    function addVersion(platform, version, cb) {

        var dateNow = new Date();

        var newAppinfo = {
            appName: 'Flutter Asia',
            appPlatform: platform,
            appVersion: version,
            createAt: dateNow,
            updateAt: dateNow
        };

        Appinfo.create(newAppinfo, function (error, result) {
            if (error) {
                cb(error);
                return;
            }
            cb(null, result);
        });
    }

};
