'use strict';

module.exports = function(Nearbyview) {
    Nearbyview.remoteMethod('getNearbyLocation', {
        http: { path: '/:id/getNearbyLocation', verb: 'get' },
        accepts: { arg: 'id', type: 'number', required: true },
        returns: {arg: 'location', type: 'Object', root: true}
    });

    Nearbyview.getNearbyLocation = function(id, cb) {
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
        var _ = require('lodash');

        // console.log(setting);
        // Default filter
        var filter = {
            where: {
                id: { neq: id },
                geolocation: {
                    near: myLocation,
                    maxDistance: setting.distance,
                    unit: 'kilometers'
                },
                age: {
                    between: [setting.ageLower, setting.ageUpper]
                },
                visibility: true
            }
        }

        // Config filter gender
        if (setting.men && !setting.women) {
            filter.where['gender'] = 0;
        } else if (setting.women && !setting.men) {
            filter.where['gender'] = 1;
        }

        // Config filter religion
        console.log(setting.religion);
        if (! _.isNull(setting.religion)) {
            filter.where['religion'] = { inq: JSON.parse(setting.religion) }
        }

        // Config filter zodiak
        if (!_.isNull(setting.zodiac)) {
            filter.where['zodiac'] = { inq: JSON.parse(setting.zodiac) }
        }

        // Getting data from db
        Nearbyview.find(filter, function(err, result) {
            if (err) {
                cb(err)
            }
            
            getDistance(myLocation, result, cb);
        });
    }

    // Add distance to
    function getDistance(myLocation, result, cb) {
        var _ = require('lodash');

        // Change result
        var newResult = [];
        if (! _.isEmpty(result)) {
            _.forEach(result, function(data) {
                data['distanceTo'] = myLocation.distanceTo(data.geolocation, {type: 'kilometers'}).toFixed(2);
                newResult.push(data);
            });
        }

        cb(null, newResult);
    }
};
