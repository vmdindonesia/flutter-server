'use strict';

module.exports = function (Statistic) {
    var app = require('../../server/server');
    var moment = require('moment');

    // LIST OF REMOTE METHOD ============================================
    Statistic.remoteMethod('getNewRegisterNumber', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'startDate', type: 'date', required: true },
            { arg: 'endDate', type: 'date', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Statistic.remoteMethod('getLikeListNumber', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'startDate', type: 'date', required: true },
            { arg: 'endDate', type: 'date', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Statistic.remoteMethod('getMatchNumber', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'startDate', type: 'date', required: true },
            { arg: 'endDate', type: 'date', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Statistic.remoteMethod('getGenderNumber', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'startDate', type: 'date', required: true },
            { arg: 'endDate', type: 'date', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });
    // LIST OF REMOTE METHOD ============================================

    Statistic.getNewRegisterNumber = getNewRegisterNumber;
    Statistic.getLikeListNumber = getLikeListNumber;
    Statistic.getMatchNumber = getMatchNumber;
    Statistic.getGenderNumber = getGenderNumber;

    // LIST OF FUNCTION ============================================
    function getNewRegisterNumber(startDate, endDate, options, cb) {
        var Members = app.models.Members;
        var ds = Members.dataSource;

        var startDate = moment(startDate).startOf('day').toDate();
        var endDate = moment(endDate).endOf('day').toDate();

        var sql = "SELECT COUNT(*) AS 'countMember', date(created_at) as registerDate FROM Members " +
            "WHERE deleted_at IS NULL AND(created_at " +
            "BETWEEN ? AND ?) GROUP BY (registerDate);";

        ds.connector.execute(sql, [startDate, endDate], function (error, result) {
            if (error) {
                return cb(error);
            }

            cb(null, result);
        });
    }

    function getLikeListNumber(startDate, endDate, options, cb) {
        var Likelist = app.models.LikeList;
        var ds = Likelist.dataSource;

        var startDate = moment(startDate).startOf('day').toDate();
        var endDate = moment(endDate).endOf('day').toDate();

        var sql = "SELECT COUNT(*) AS 'countMember', date(created_at) as likeDate FROM Like_list " +
            "WHERE (created_at BETWEEN ? AND ?) GROUP BY (likeDate);";

        ds.connector.execute(sql, [startDate, endDate], function (error, result) {
            if (error) {
                return cb(error);
            }

            cb(null, result);
        });
    }

    function getMatchNumber(startDate, endDate, options, cb) {
        var Matches = app.models.Matches;
        var ds = Matches.dataSource;

        var startDate = moment(startDate).startOf('day').toDate();
        var endDate = moment(endDate).endOf('day').toDate();

        var sql = "SELECT COUNT(*) AS 'countMember', date(created_at) as matchDate FROM Matches " +
            "WHERE (created_at BETWEEN ? AND ?) GROUP BY (matchDate);";

        ds.connector.execute(sql, [startDate, endDate], function (error, result) {
            if (error) {
                return cb(error);
            }

            cb(null, result);
        });
    }


    function getGenderNumber(startDate, endDate, options, cb) {
        var Members = app.models.Members;
        var ds = Members.dataSource;

        var startDate = moment(startDate).startOf('day').toDate();
        var endDate = moment(endDate).endOf('day').toDate();

        var sql = "SELECT COUNT(gender) AS 'countGender', gender FROM Members " +
            "WHERE gender IS NOT NULL AND deleted_at IS NULL AND(created_at " +
            "BETWEEN ? AND ?) GROUP BY (gender);";

        ds.connector.execute(sql, [startDate, endDate], function (error, result) {
            if (error) {
                return cb(error);
            }

            var newResult =  result;

            result.forEach(function(data, index) {
                if (data.gender == 0) {
                    newResult[index]['genderName'] = 'Male'
                } else {
                    newResult[index]['genderName'] = 'Female'
                }
            }, this);

            cb(null, newResult);
        });
    }

    // END LIST OF FUNCTION ============================================
};
