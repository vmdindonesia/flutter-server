'use strict';

module.exports = {
    insertLog: function (ctx, page, activity) {
        var app = require('../server/server');

        const data = {
            page: page,
            activity: activity,
            logDate: new Date()
        };

        // If this is admin@flutterasia.com
        const LogAdmin = app.models.LogAdmin;
        const Members = app.models.Members;
        const userId = ctx.req.accessToken.userId;

        const filter = {
            fields: ['id', 'email']
        };

        Members.findById(userId, filter, function (error, result) {
            if (error) {
                console.log(error);
            } else {
                if (result.email == 'admin@flutterasia.com') {
                    LogAdmin.create(data, function (error, result) { });
                }
            }
        });
    }
}