'use strict';

module.exports = function (Verify14view) {

    Verify14view.remoteMethod('getUser', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Verify14view.getUser = getUser;

    function getUser(options, cb) {

        var filter = {
            include: [
                {
                    relation: 'members',
                    scope: {
                        fields: ['id', 'fullName', 'email', 'gender', 'phone']
                    }
                }
            ],
            order: 'createdAt DESC'
        };

        return Verify14view.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            return cb(null, result);
        });

    }

};
