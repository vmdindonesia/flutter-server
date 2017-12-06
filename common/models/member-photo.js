'use strict';

module.exports = function (Memberphoto) {
    var app = require('../../server/server');

    // Memberphoto.observe('before save', function (ctx, next) {
    //     if (ctx.instance == undefined) {
    //         return next();
    //     }

    //     var tmp = ctx.instance.src;
    //     ctx.instance.src = null;
    //     ctx.instance.srcTmp = tmp;
    //     next();
    // });

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
                and: [
                    { srcTmp: { neq: null } },
                    { srcTmp: { nlike: 'init_first' } }
                ]
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

                // cb(null, result);
                updateMembers(result, cb);
            });
        });
    }

    function updateMembers(memberPhoto, cb) {
        var Members = app.models.Members;

        Members.findById(memberPhoto.membersId, function (error, result) {
            if (error) {
                return cb(error);
            }

            result.updateAttribute('updatedAt', new Date(), function (error, result) {
                if (error) {
                    return cb(error);
                }

                cb(null, memberPhoto);
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
