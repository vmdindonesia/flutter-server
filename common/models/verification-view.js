'use strict';

module.exports = function (Verificationview) {

    Verificationview.remoteMethod('getVerificationList', {
        description: 'Verification List',
        http: { verb: 'get' },
        returns: [
            { arg: 'status', type: 'string' },
            { arg: 'result', type: 'array' },
            { arg: 'error', type: 'object' }
        ]
    });

    Verificationview.getVerificationList = function (cb) {
        Verificationview.find(function (error, result) {
            cb(null, 'OK', result, {});
        });
    }

};
