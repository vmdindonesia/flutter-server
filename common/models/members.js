'use strict';

module.exports = function(Members) {


     Members.remoteMethod(
        'getRandomMembers', {
            accepts: [{
                arg: 'params',
                type: 'Object',
                required: true,
                http: { source: 'body' }
            }],
            returns: {
                arg: 'accessToken', type: 'object', root: true,
            },
            http: {
                path: '/getRandomMembers',
                verb: 'post'
            }
        });

    Members.getRandomMembers = function (params, cb) {
        // let modelmembers = app.models.Members;
        // let ds=Members.data
        // modelmembers.find(
            
        // )
        console.log(params,"remote methed members");
    }

};
