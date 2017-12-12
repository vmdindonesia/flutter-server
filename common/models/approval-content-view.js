'use strict';

module.exports = function(Approvalcontentview) {
    const LogAdmin = require('../log-admin');

    Approvalcontentview.afterRemote('find', function (ctx, modelInstance, next) {
        LogAdmin.insertLog(ctx, 'Feed', 'List feed members');

        next();
    });
};
