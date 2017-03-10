'use strict';

module.exports = function (Approvalmessage) {
    var tag = {
        reject: 'REJECT'
    }


    Approvalmessage.beforeRemote('create', function (context, user, next) {
        var dateNow = new Date();
        context.args.data.createAt = dateNow;
        context.args.data.updateAt = dateNow;
        next();
    });

    Approvalmessage.remoteMethod('sendRejectMessage', {
        description: 'Send Approval Message to User',
        http: { verb: 'post' },
        accepts: [
            { arg: 'fromId', type: 'number', required: true },
            { arg: 'toId', type: 'number', required: true },
            { arg: 'message', type: 'string', required: true }
        ],
        returns: [
            { arg: 'status', type: 'string' },
            { arg: 'result', type: 'object' },
            { arg: 'error', type: 'object' }
        ]
    });

    Approvalmessage.sendRejectMessage = function (fromId, toId, message, cb) {

        var dateNow = new Date();

        Approvalmessage.create({
            fromId: fromId,
            toId: toId,
            tag: tag.reject,
            message: message,
            createAt: dateNow,
            updateAt: dateNow
        }, function (error, result) {
            if (error) {
                cb(null, 'FAIL', undefined, error);
            } else {
                //=======SENDING EMAIL, BERDASARKAN RESULT=======
                /* CONTOH RESULT  
                 * {
                 *      "status": {
                 *          "fromId": 10,
                 *          "toId": 5,
                 *          "tag": "REJECT",
                 *          "message": "Gambar masih kurang jelas",
                 *          "createAt": "2017-03-10T07:22:45.791Z",
                 *          "updateAt": "2017-03-10T07:22:45.791Z",
                 *          "id": 2
                 *      }
                 * }
                 *
                 */

                //===============================================
                cb(null, 'OK', result);
            }
        })
    }

};
