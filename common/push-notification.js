'use strict';

module.exports = {
    send: send,
    like: like,
    chat: chat,
    match: match
};

function send(data, someAuth) {
    var headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Basic " + someAuth
    };

    var options = {
        host: "onesignal.com",
        port: 443,
        path: "/api/v1/notifications",
        method: "POST",
        headers: headers
    };

    var https = require('https');
    var req = https.request(options, function (res) {
        res.on('data', function (data) {
            console.log("Response:");
            console.log(JSON.parse(data));
        });
    });

    req.on('error', function (e) {
        console.log("ERROR:");
        console.log(e);
    });

    req.write(JSON.stringify(data));
    req.end();
}

function like(senderUserId, recipientUserId) {
    var app = require('../server/server');
    var Members = app.models.Members;
    Members.findById(senderUserId, function (error, result) {
        if (result) {
            var userData = result;
            // var message = {
            //     app_id: '7e0eb180-9d56-4823-8d89-387c06ae97fd',
            //     android_group: 'like',
            //     android_group_message: {
            //         en: '$[notif_count] people like your profile',
            //         id: '$[notif_count] orang menyukai profile anda'
            //     },
            //     contents:
            //     {
            //         en: userData.fullName + ' like your profile',
            //         id: userData.fullName + ' menyukai profil anda'
            //     },
            //     filters: [
            //         { field: 'tag', key: 'userId', relation: '=', value: recipientUserId }
            //     ],
            //     data: {
            //         tag: 'like'
            //     }
            // };
            var message = {
                app_id: '7e0eb180-9d56-4823-8d89-387c06ae97fd',
                android_group: 'like',
                android_group_message: {
                    en: '$[notif_count] people like your profile',
                    id: '$[notif_count] orang menyukai profile anda'
                },
                contents:
                {
                    en: 'Someone like your profile',
                    id: 'Seseorang menyukai profil anda'
                },
                filters: [
                    { field: 'tag', key: 'userId', relation: '=', value: recipientUserId }
                ],
                data: {
                    tag: 'like'
                }
            };
            send(message, 'ZTNlMGFiOGMtZTk2Yy00OTUxLTkyOWUtNTllNmNmZTE3OTRm');
        }
    })
}

function chat(senderUserId, recipientUserId, text, data) {
    var app = require('../server/server');
    var Members = app.models.Members;
    var filter = {
        include: [
            {
                relation: 'rel_visibility',
                scope: {
                    where: { filterId: 1 }
                }
            }
        ]
    }
    Members.findById(senderUserId, filter, function (error, result) {
        if (result) {
            if (result.rel_visibility()[0]['match'] == 0) {
                var randomNum = Math.random();
                var expectedNum = Math.floor(randomNum * 100000);
                var stringNum = ('0000' + expectedNum).slice(-5);
                result.fullName = result.fullName[0] + stringNum;
            }
            var userData = result;
            var message = {
                app_id: '7e0eb180-9d56-4823-8d89-387c06ae97fd',
                headings: { en: userData.fullName },
                contents: { en: text },
                android_group: 'chat',
                android_group_message: {
                    en: '$[notif_count] new messages',
                    id: '$[notif_count] pesan baru'
                },
                filters: [
                    { field: 'tag', key: 'userId', relation: '=', value: recipientUserId }
                ],
                data: {
                    tag: 'chat',
                    params: data
                }
            };

            // var message = {
            //     app_id: '7e0eb180-9d56-4823-8d89-387c06ae97fd',
            //     // headings: { en: userData.fullName },
            //     headings: { en: 'Flutter Asia' },
            //     contents: { en: 'You have a new message' },
            //     android_group: 'chat',
            //     android_group_message: {
            //         en: 'You have $[notif_count] new messages',
            //         id: 'Anda memiliki $[notif_count] pesan baru'
            //     },
            //     filters: [
            //         { field: 'tag', key: 'userId', relation: '=', value: recipientUserId }
            //     ],
            //     data: {
            //         tag: 'chat',
            //         params: data
            //     }
            // };

            send(message, 'ZTNlMGFiOGMtZTk2Yy00OTUxLTkyOWUtNTllNmNmZTE3OTRm');
        }
    })
}

function match(recipientUserId, data) {

    var message = {
        app_id: '7e0eb180-9d56-4823-8d89-387c06ae97fd',
        contents: { en: 'Someone match with you!', id: 'Seseorang cocok dengan anda!' },
        filters: [
            { field: 'tag', key: 'userId', relation: '=', value: recipientUserId }
        ],
        data: {
            tag: 'match',
            params: data
        }
    };
    send(message, 'ZTNlMGFiOGMtZTk2Yy00OTUxLTkyOWUtNTllNmNmZTE3OTRm');

}