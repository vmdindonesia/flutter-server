'use strict';

module.exports = function (Feedbackquestion) {

    var app = require('../../server/server');
    var common = require('../common-util');

    Feedbackquestion.remoteMethod('addQuestion', {
        http: { verb: 'post' },
        accepts: [
            { arg: 'question', type: 'string', required: true },
            { arg: 'type', type: 'string', required: true },
            { arg: 'choices', type: 'array', required: true },
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    });

    Feedbackquestion.remoteMethod('getQuestionList', {
        http: { verb: 'get' },
        accepts: [
            { arg: 'options', type: 'object', http: 'optionsFromRequest' }
        ],
        returns: { arg: 'result', type: 'object', root: true }
    })

    Feedbackquestion.addQuestion = addQuestion;
    Feedbackquestion.getQuestionList = getQuestionList;

    function addQuestion(question, type, choices, options, cb) {

        var Feedbacktype = app.models.FeedbackType;
        var Feedbackchoice = app.models.FeedbackChoice;
        var Feedbackquestiontypechoice = app.models.FeedbackQuestionTypeChoice;

        var token = options.accessToken;
        var userId = token.userId;

        var dateNow = new Date();

        Feedbackquestion.beginTransaction({
            isolationLevel: Feedbackquestion.Transaction.READ_COMMITTED
        }, function (error, tx) {
            if (error) {
                return cb(error);
            }

            var filter = {
                where: {
                    typeName: type
                }
            };

            Feedbacktype.findOne(filter, { transaction: tx }, function (error, result) {
                if (error) {
                    return tx.rollback(function (err) {
                        if (err) {
                            return cb(err);
                        }
                        return cb(error);
                    });
                }
                if (result) {
                    insertQuestion(result.feedbackTypeId);
                } else {
                    return tx.rollback(function (err) {
                        if (err) {
                            return cb(err);
                        }
                        return cb({
                            name: 'Feedback Type Not Match',
                            status: 404,
                            message: 'Feedback Type : ' + type
                        });
                    });
                }
            });

            function insertQuestion(feedbackTypeId) {

                var newFeedbackquestion = {
                    questionText: question,
                    createdAt: dateNow
                };

                Feedbackquestion.create(newFeedbackquestion, { transaction: tx }, function (error, result) {
                    if (error) {
                        return tx.rollback(function (err) {
                            if (err) {
                                return cb(err);
                            }
                            return cb(error);
                        });
                    }

                    insertChoices(result.feedbackQuestionId, feedbackTypeId);
                });

            }

            function insertChoices(feedbackQuestionId, feedbackTypeId) {
                var choiceList = JSON.parse(JSON.stringify(choices));
                if (choiceList[0]) {
                    common.asyncLoop(choiceList.length, function (loop) {
                        var index = loop.iteration();
                        var item = choiceList[index];

                        var filter = {
                            where: {
                                choiceValue: item
                            }
                        }
                        Feedbackchoice.findOne(filter, { transaction: tx }, function (error, result) {
                            if (error) {
                                return tx.rollback(function (err) {
                                    if (err) {
                                        return cb(err);
                                    }
                                    return cb(error);
                                })
                            }
                            if (result) {
                                insertMapping(feedbackQuestionId, feedbackTypeId, result.feedbackChoiceId, function () {
                                    loop.next();
                                });
                            } else {
                                var newFeedbackchoice = {
                                    choiceValue: item,
                                    createdAt: dateNow
                                };
                                Feedbackchoice.create(newFeedbackchoice, { transaction: tx }, function (error, result) {
                                    if (error) {
                                        return tx.rollback(function (err) {
                                            if (err) {
                                                return cb(err);
                                            }
                                            return cb(error);
                                        });
                                    }
                                    insertMapping(feedbackQuestionId, feedbackTypeId, result.feedbackChoiceId, function () {
                                        loop.next();
                                    });
                                });
                            }
                        });
                    }, function () {
                        return tx.commit(function (err) {
                            if (err) {
                                return cb(err);
                            }
                            return cb(null, {
                                status: 'OK'
                            });
                        });

                        // return tx.rollback(function (err) {
                        //     if (err) {
                        //         return cb(err);
                        //     }
                        //     return cb({
                        //         name: 'Feedback Choices Not Valid',
                        //         status: 404,
                        //         message: 'Feedback Choices must be array : ' + choices
                        //     });
                        // });
                    });

                } else {
                    return tx.rollback(function (err) {
                        if (err) {
                            return cb(err);
                        }
                        return cb({
                            name: 'Feedback Choices Not Valid',
                            status: 404,
                            message: 'Feedback Choices must be array : ' + choices
                        });
                    });
                }

                function insertMapping(feedbackQuestionId, feedbackTypeId, feedbackChoiceId, callback) {
                    var newFeedbackquestiontypechoice = {
                        feedbackQuestionId: feedbackQuestionId,
                        feedbackTypeId: feedbackTypeId,
                        feedbackChoiceId: feedbackChoiceId,
                        createdAt: dateNow
                    }
                    Feedbackquestiontypechoice.create(newFeedbackquestiontypechoice, { transaction: tx }, function (error, result) {
                        if (error) {
                            return tx.rollback(function (err) {
                                if (err) {
                                    return cb(err);
                                }
                                return cb(error);
                            });
                        }
                        callback();
                    })
                }
            }

        });


    }

    function getQuestionList(options, cb) {
        var token = options.accessToken;
        var userId = token.userId;

        var filter = {
            fields: ['feedbackQuestionId', 'questionText'],
            include: [{
                relation: 'feedbackTypes',
                scope: {
                    fields: ['feedbackTypeId', 'typeName'],
                    limit: 1
                }
            }, {
                relation: 'feedbackChoices',
                scope: {
                    fields: ['feedbackChoiceId', 'choiceValue']
                }
            }]
        }
        Feedbackquestion.find(filter, function (error, result) {
            if (error) {
                return cb(error);
            }
            result = JSON.parse(JSON.stringify(result));
            result.forEach(function (item) {
                item.feedbackType = item.feedbackTypes[0];
                delete item['feedbackTypes'];

                item.feedbackChoices.forEach(function (element) {
                    element.pattern = item.feedbackQuestionId + '/' + item.feedbackType.feedbackTypeId + '/' + element.feedbackChoiceId;
                }, this);
            }, this);

            return cb(null, result);
        })

    }

};
