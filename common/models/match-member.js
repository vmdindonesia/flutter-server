'use strict';

module.exports = function (Matchmember) {
    // Matchmember.remoteMethod('createChat', {
    //     http: { path: '/createChat', verb: 'post' },
    //     accepts: { arg: 'param', type: 'Object' },
    //     returns: { arg: 'response', type: 'array',  root: true }
    // });

    // Matchmember.createChat = function(data, cb) {
    // 	var socket = Matchmember.app.io;

    //     Matchmember.create(data, function (err, result) {
    //     	if (err) {
    //     		cb(err);
    //     		return;
    //     	}

    //         socket.emit('chating', result);
    //     	cb(null, result);
    //     });
    // };


    Matchmember.afterRemote('create', function (ctx, modelInstance, next) {
        console.log(JSON.stringify(modelInstance));
        var app = require('../../server/server');
        var Pushnotification = require('../push-notification.js');

        var Devicetokenmapping = app.models.Devicetokenmapping;
        var Members = app.models.Members;
        console.log('SEND NOTIF');
        //model instance isi
        Members.findById(modelInstance.membersId, function (error, result) {
            if (result) {
                var userData = result;
                Devicetokenmapping.getUserToken(modelInstance.membersId, function (error, result) {
                    if (result) {
                        var tokens = [];
                        tokens.push(result);
                        var message = {
                            app_id: '7e0eb180-9d56-4823-8d89-387c06ae97fd',
                            contents: { en: 'Someone match with you!' },
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
