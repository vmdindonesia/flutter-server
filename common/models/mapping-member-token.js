'use strict';

module.exports = function (Mappingmembertoken) {

    Mappingmembertoken.remoteMethod('registerToken', {
        description: 'Registering Token of User in DB',
        http: { verb: 'post' },
        accepts: [
            { arg: 'userId', type: 'number', required: true },
            { arg: 'token', type: 'string', required: true }
        ],
        returns: { arg: 'result', type: 'boolean' }
    });

    Mappingmembertoken.registerToken = function (userId, token, cb) {
        Mappingmembertoken.findById(userId, function (error, result) {
            if (error) {
                cb(error);
            } else {
                var dateNow = new Date();
                if (result) {
                    Mappingmembertoken.update({
                        id: userId,
                        playerId: token,
                        updateAt: dateNow
                    }, function (error, result) {
                        if (error) {
                            cb(error);
                        } else {
                            cb(null, true);
                        }
                    });
                } else {
                    Mappingmembertoken.create({
                        id: userId,
                        playerId: token,
                        createAt: dateNow,
                        updateAt: dateNow
                    }, function (error, result) {
                        if (error) {
                            cb(error);
                        } else {
                            cb(null, true);
                        }
                    });
                }
            }
        })

    }



};
