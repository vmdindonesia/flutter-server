'use strict';

module.exports = function (Feedbackmemberanswer) {

    var app = require('../../server/server');
    var common = require('../common-util');
    var lodash = require('lodash');

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

    Feedbackmemberanswer.remoteMethod('getSummary', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'startDate', type: 'date', required: true },
            { arg: 'endDate', type: 'date', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Feedbackmemberanswer.remoteMethod('getComment', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'limit', type: 'number', required: true },
            { arg: 'offset', type: 'number', required: true },
            { arg: 'platforms', type: 'array', required: true },
            { arg: 'versions', type: 'array', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Feedbackmemberanswer.addAnswer = addAnswer;
    Feedbackmemberanswer.getSummary = getSummary;
    Feedbackmemberanswer.getComment = getComment;

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

    function getSummary(startDate, endDate, options, cb) {

        var Feedbackquestiontypechoice = app.models.FeedbackQuestionTypeChoice;

        var filter = {
            fields: ['feedbackQuestionTypeChoiceId', 'feedbackQuestionId', 'feedbackChoiceId'],
            include: [{
                relation: 'feedbackMemberAnswers',
                scope: {
                    fields: ['membersId'],
                    where: {
                        createdAt: { between: [startDate, endDate] }
                    }
                }
            }, {
                relation: 'feedbackQuestion',
                scope: {
                    fields: ['questionText']
                }
            }, {
                relation: 'feedbackChoice',
                scope: {
                    fields: ['choiceValue']
                }
            }]
        };

        return Feedbackquestiontypechoice.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            result = JSON.parse(JSON.stringify(result));
            var newResult = result;
            newResult = lodash.groupBy(result, 'feedbackQuestionId');
            newResult = lodash.mapValues(newResult, function (o) {
                var temp = {};
                temp.question = o[0].feedbackQuestion.questionText;
                var temp2 = lodash.groupBy(o, 'feedbackChoiceId');
                var temp3 = {};
                lodash.forEach(temp2, function (value, key) {
                    temp3[value[0].feedbackChoice.choiceValue] = value[0].feedbackMemberAnswers.length
                });
                temp.choices = temp3;
                return temp;
            });
            return cb(null, newResult);
        });

    }

    function getComment(limit, offset, platforms, versions, options, cb) {

        var Feedback = app.models.Feedback;

        var andList = [];

        if (platforms.length > 0) {
            andList.push({
                appPlatform: { inq: platforms }
            });
        }

        if (versions.length > 0) {
            andList.push({
                appVersion: { inq: versions }
            });
        }

        var filter = {
            where: {
                and: andList
            },
            include: {
                relation: 'members',
                scope: {
                    fields: ['fullName'],
                    include: {
                        relation: 'memberPhotos',
                        scope: {
                            fields: ['src']
                        }
                    }
                }
            },
            limit: limit,
            skip: offset,
            order: 'createdAt DESC'
        };

        return Feedback.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            // result = JSON.parse(JSON.stringify(result));
            // result = lodash.groupBy(result, 'appPlatform');
            // result = lodash.mapValues(result, function (o) {
            //     return lodash.groupBy(o, 'appVersion');
            // });
            return cb(null, result);
        });


    }

};
