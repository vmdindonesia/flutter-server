'use strict';

module.exports = function (Memberimage) {

    var app = require('../../server/server');

    Memberimage.beforeRemote('deleteById', function (ctx, modelInstance, next) {

        var Members = app.models.Members;

        var itemId = ctx.args.id;
        var dateNow = new Date();

        return Memberimage.findById(itemId, function (error, result) {
            if (result) {
                var userId = result.membersId;
                return Members.findById(userId, function (error, result) {
                    return result.updateAttribute('updatedAt', dateNow, function (error, result) {
                        return next();
                    });
                });
            } else {
                return next();
            }
        });
    });

    Memberimage.afterRemote('create', function (ctx, modelInstance, next) {

        var Members = app.models.Members;

        var userId = ctx.args.data.membersId;

        var dateNow = new Date();

        return Members.findById(userId, function (error, result) {
            return result.updateAttribute('updatedAt', dateNow, function (error, result) {
                return next();
            });
        });

    });

};
