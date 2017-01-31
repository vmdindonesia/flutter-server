'use strict';

module.exports = function(Nearby) {
    Nearby.remoteMethod('getNearbyLocation', {
        http: { path: '/:id/getNearbyLocation', verb: 'post' },
         accepts: [
            { arg: 'id', type: 'number', required: true },
            {arg: 'loc', type: 'GeoPoint', required: true }
        ],
        returns: {arg: 'location', type: 'Object', root: true}
    });

    Nearby.getNearbyLocation = function(id, location, cb) {
        var app = require('../../server/server');
        var members = app.models.Members;
        var loopback = require('loopback');

        // Get user setting
        members.findById(
        id, 
        {
            fields: { email: true, fullName: true, id: true },
            include: [{
                relation: 'nearbies',
                scope: {
                    fields: { geolocation: true }
                }
            }, 'memberSetting']
        }, function(err, member) {
            if (err) {
                cb(null, err);
                return;
            }

            // Get near by my location
            var myLocation = new loopback.GeoPoint({
                lat: member.nearbies().geolocation.lat, 
                lng: member.nearbies().geolocation.lng
            });
            var setting = member.memberSetting();
            
            // Get nearby member
            getMember(id, myLocation, setting, cb);
        });
    }

    function getMember(id, myLocation, setting, cb) {
        Nearby.find({
            where: {
                geolocation: {
                    near: myLocation,
                    maxDistance: setting.distance,
                    unit: 'kilometers'
                },
                membersId: { neq: id }
            },
            include: 'members'
        }, function(err, result) {
            if (err) {
                cb(err)
            }

            cb(null, result);
        });
    }
};
