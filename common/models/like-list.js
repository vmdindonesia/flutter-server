'use strict';

module.exports = function (Likelist) {

    Likelist.afterRemote('create', function (ctx, modelInstance, next) {
        console.log(JSON.stringify(modelInstance));
        var app = require('../../server/server');
        var Pushnotification = require('../push-notification.js');

        var Devicetokenmapping = app.models.Devicetokenmapping;
        var Members = app.models.Members;
        console.log('SEND NOTIF');
        //model instance isi {"id":404,"likeUser":"318767","likeMember":"183836"}
        Members.findById(modelInstance.likeMember, function (error, result) {
            if (result) {
                var userData = result;
                Devicetokenmapping.getUserToken(modelInstance.likeMember, function (error, result) {
                    if (result) {
                        var tokens = [];
                        tokens.push(result);
                        var message = {
                            app_id: '7e0eb180-9d56-4823-8d89-387c06ae97fd',
                            contents: { en: userData.fullName + ' like your profile' },
                            include_player_ids: tokens
                        };
                        Pushnotification.send(message, 'ZTNlMGFiOGMtZTk2Yy00OTUxLTkyOWUtNTllNmNmZTE3OTRm');
                    }
                    console.log('END SEND NOTIF');
                })

            }
        })
        next();
    })

};
