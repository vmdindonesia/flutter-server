'use strict';

module.exports = function (Adminverify) {

    var app = require('../../server/server');
    var lodash = require('lodash');

    Adminverify.remoteMethod('getList', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'flag', type: 'number', required: true },
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Adminverify.remoteMethod('getListStatus', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'flag', type: 'number', required: true },
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Adminverify.getList = getList;
    Adminverify.getListStatus = getListStatus;


    function getList(flag, limit, offset, options, cb) {

        var Memberverifystatus = app.models.MemberVerifyStatus;

        var orList = [];
        var verifyList = ['ktp', 'sim', 'schoolCertificate', 'passport', 'businessCard'];

        orList = verifyList.map(function (x) {
            var temp = {};
            temp[x] = flag;
            return temp;
        });

        var filter = {
            fields: [
                'userId',
                'ktp',
                'sim',
                'schoolCertificate',
                'passport',
                'businessCard',
                'updateAt',
                'createAt'
            ],
            where: {
                or: orList,
            },
            include: [{
                relation: 'memberPhotos',
                scope: {
                    fields: [
                        'ktp',
                        'sim',
                        'schoolCertificate',
                        'passport',
                        'businessCard'
                    ]
                }
            }],
            limit: limit,
            skip: offset,
            order: 'updateAt DESC'
        }

        return Memberverifystatus.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }


            return cb(null, result);
        });


    }

    function getListStatus(flag, limit, offset, options, cb) {
        var filter = {
            fields: [
                'memberId',
                'verifiedBy',
                'verifiedAt',
                'verifyType',
                'verifyImg'
            ], include: [
                {
                    relation: 'verifyMemberPhotos',
                    scope: {
                        fields: ['src']
                    }
                }, {
                    relation: 'verifyMember',
                    scope: {
                        fields: ['fullName']
                    }
                },
                {
                    relation: 'verifyBy',
                    scope: {
                        fields: ['fullName']
                    }
                }
            ],
            where: {
                verifyStatus: flag
            },
            limit: limit,
            offset: offset,
            order: 'verifiedAt DESC'
        }

        return Adminverify.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            return cb(null, result);
        });

    }

};
