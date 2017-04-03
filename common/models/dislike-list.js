'use strict';

module.exports = function (Dislikelist) {

    Dislikelist.remoteMethod('doDislike', {
        description: 'Add to Dislike List',
        http: { verb: 'post' },
        accepts: [
            { arg: 'userId', type: 'number', required: true, description: 'Id of user, who current user like' },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object' }
    });

    Dislikelist.doDislike = function (userId, options, cb) {
        var token = options.accessToken;
        var currentUserId = token.userId;
        var dislikedUserId = userId;

        var newDislike = {
            dislikeUser: currentUserId,
            dislikeMamber: dislikedUserId
        };

        Dislikelist.create(newDislike, function (error, result) {
            if (error) {
                cb(error);
            } else {
                cb(null, result);
            }
        });

    }

};
