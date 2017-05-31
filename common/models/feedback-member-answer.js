'use strict';

module.exports = function (Feedbackmemberanswer) {

    var app = require('../../server/server');
    var common = require('../common-util');

    Feedbackmemberanswer.remoteMethod('addAnswer', {
        http: { verb: 'post' },
        accepts: [
            { arg: 'answer', type: 'array', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: [
            { arg: 'result', type: 'object', root: true }
        ]
    });

    Feedbackmemberanswer.addAnswer = addAnswer;

    function addAnswer(answer, options, cb) {
        var Feedbackquestiontypechoice = app.models.FeedbackQuestionTypeChoice;

        var token = options.accessToken;
        var userId = token.userId;

        var dateNow = new Date();

        answer = JSON.parse(JSON.stringify(answer));

        common.asyncLoop(answer.length, function (loop) {
            var index = loop.iteration();
            var item = answer[index];

            var pattern = item.split("/");

            var filter = {
                where: {
                    feedbackQuestionId: pattern[0],
                    feedbackTypeId: pattern[1],
                    feedbackChoiceId: pattern[2]
                }
            };

            Feedbackquestiontypechoice.findOne(filter, function (error, result) {
                if (error) {
                    return cb(error);
                }
                if (result) {
                    insertMemberAnswer(result.feedbackQuestionTypeChoiceId, function () {
                        loop.next();
                    });
                } else {
                    return cb({
                        name: 'Pattern not found',
                        status: 404,
                        message: 'Answer Pattern not found : ' + pattern
                    });
                }
            });

        }, function () {
            return cb(null, {
                status: 'OK'
            });

        });

        function insertMemberAnswer(feedbackQuestionTypeChoiceId, callback) {
            var newFeedbackmemberanswer = {
                memberId: userId,
                feedbackQuestionTypeChoiceId: feedbackQuestionTypeChoiceId,
                createdAt: dateNow
            }
            Feedbackmemberanswer.create(newFeedbackmemberanswer, function (error, result) {
                if (error) {
                    return cb(error);
                }
                callback();
            });
        }
    }

};
