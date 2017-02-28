'use strict';

module.exports = function (Photoktp) {

    Photoktp.beforeRemote('create', function (context, user, next) {
        context.args.data.createDatetime = new Date();
        next();
    });

};
