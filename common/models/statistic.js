'use strict';

module.exports = function (Statistic) {
    var app = require('../../server/server');
    var moment = require('moment');

    // LIST OF REMOTE METHOD ============================================
    Statistic.remoteMethod('getNewRegisterNumber', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'days', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Statistic.remoteMethod('getLikeListNumber', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'days', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Statistic.remoteMethod('getMatchNumber', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'days', type: 'number', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });
    // LIST OF REMOTE METHOD ============================================

    Statistic.getNewRegisterNumber = getNewRegisterNumber;
    Statistic.getLikeListNumber = getLikeListNumber;
    Statistic.getMatchNumber = getMatchNumber;

    // LIST OF FUNCTION ============================================
    function getNewRegisterNumber(days, options, cb) {
        var Members = app.models.Members;
        var startDate = moment().subtract(days, 'days').endOf('day');
        var endDate = moment().endOf('day');

        var where = {
            createdAt: { between: [startDate, endDate] }
        }

        Members.count(where, function (error, result) {
            if (error) {
                return cb(error);
            }

            return cb(null, result);
        });
    }

    function getLikeListNumber(days, options, cb) {
        var Likelist = app.models.LikeList;
        var startDate = moment().subtract(days, 'days').endOf('day');
        var endDate = moment().endOf('day');

        var where = {
            createdAt: { between: [startDate, endDate] }
        }

        Likelist.count(where, function (error, result) {
            if (error) {
                return cb(error);
            }

            return cb(null, result);
        });
    }

    function getMatchNumber(days, options, cb) {
        var Matches = app.models.Matches;
        var startDate = moment().subtract(days, 'days').endOf('day');
        var endDate = moment().endOf('day');

        var where = {
            createdAt: { between: [startDate, endDate] }
        }

        Matches.count(where, function (error, result) {
            if (error) {
                return cb(error);
            }

            return cb(null, result);
        });
    }

    // END LIST OF FUNCTION ============================================
};
