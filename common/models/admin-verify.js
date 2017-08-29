'use strict';

module.exports = function (Adminverify) {

    Adminverify.remoteMethod('getList', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Adminverify.getList = getList;

    function getList(options, cb) {

        var filter = {};

        return Adminverify.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            return cb(null, result);
        });


    }

};
