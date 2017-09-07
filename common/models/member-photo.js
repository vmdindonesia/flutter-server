'use strict';

module.exports = function (Memberphoto) {

    Memberphoto.observe('before save', function (ctx, next) {
        if (ctx.instance == undefined) {
            return next();
        }

        var tmp = ctx.instance.src;
        ctx.instance.src = null;
        ctx.instance.srcTmp = tmp;
        next();
    });

    // REMOTE METHOD //
    Memberphoto.remoteMethod('getList', {
        http: { path: '/getList', verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Memberphoto.remoteMethod('adminApprovePhoto', {
        http: { path: '/adminApprovePhoto/:id', verb: 'get' },
        accepts: [
            { arg: 'id', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Memberphoto.remoteMethod('adminRejectPhoto', {
        http: { path: '/adminRejectPhoto/:id', verb: 'get' },
        accepts: [
            { arg: 'id', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Memberphoto.getList = getList;
    Memberphoto.adminApprovePhoto = adminApprovePhoto;
    Memberphoto.adminRejectPhoto = adminRejectPhoto;

    // END REMOTE METHOD //

    // FUNCTION //
    function getList(limit, offset, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            fields: ['id', 'membersId', 'src', 'srcTmp'],
            where: {
                srcTmp: { neq: null }
            },
            include: {
                relation: 'members',
                scope: {
                    fields: ['fullName', 'gender', 'bday']
                }
            },
            limit: limit,
            skip: offset,
            order: 'id DESC'
        };

        Memberphoto.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }

            cb(null, result);
        });
    }

    function adminApprovePhoto(id, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        Memberphoto.findById(id, function (error, result) {
            if (error) {
                return cb(error);
            }

            var data = {
                src: result.srcTmp,
                srcTmp: null
            };

            result.updateAttributes(data, function (error, result) {
                if (error) {
                    return cb(error);
                }

                cb(null, result);
            });
        });
    }

    function adminRejectPhoto(id, options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        Memberphoto.findById(id, function (error, result) {
            if (error) {
                return cb(error);
            }

            var data = {
                src: null,
                srcTmp: null
            };

            result.updateAttributes(data, function (error, result) {
                if (error) {
                    return cb(error);
                }

                cb(null, result);
            });
        })
    }
    // END FUNCTION //
};
