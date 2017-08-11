'use strict';

module.exports = function (Reportmembers) {
    // BEGIN REMOTE METHOD ====================================================================

    Reportmembers.remoteMethod('getReportList', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    // END REMOTE METHOD ====================================================================

    // BEGIN LIST OF FUNCTION ===============================================================

    Reportmembers.getReportList = getReportList;

    // END LIST OF FUNCTION =================================================================

    function getReportList(limit, offset, cb) {
        var filter = {
            include: [
                {
                    relation: 'memberPhotos',
                    scope: {
                        fields: ['src']
                    }
                },
                {
                    relation: 'reportMember',
                    scope: {
                        fields: ['fullName']
                    }
                },
                {
                    relation: 'reportedBy',
                    scope: {
                        fields: ['fullName']
                    }
                }
            ],
            limit: limit,
            offset: offset,
            order: 'createdDate DESC'
        };

        Reportmembers.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }

            cb(null, result);
        });
    }
};
