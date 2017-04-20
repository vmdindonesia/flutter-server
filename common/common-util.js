'use strict';

module.exports = {
    asyncLoop: asyncLoop,
    validateParams: validateParams,
    calculateAge: calculateAge
}

function asyncLoop(iterations, func, callback) {
    var index = 0;
    var done = false;
    var loop = {
        next: function () {
            if (done) {
                return;
            }

            if (index < iterations) {
                index++;
                func(loop);

            } else {
                done = true;
                callback();
            }
        },

        iteration: function () {
            return index - 1;
        },

        break: function () {
            done = true;
            callback();
        }
    };
    loop.next();
    return loop;
}

function validateParams(params, key, dataType) {

    if (typeof params !== 'object') {
        throw {
            name: 'validators.parmeter.datatype.mismatch',
            status: 500, // INTERNAL SERVER ERROR
            message: 'expected first parameter to be object, got ' + typeof params
        };
    } else if (typeof key !== 'string') {
        throw {
            name: 'validators.parameter.datatype.mismatch',
            status: 500, // INTERNAL SERVER ERROR
            message: 'expected second parameter to be string, got ' + typeof key
        };
    } else if (typeof dataType !== 'string') {
        throw {
            name: 'validators.params.datatype.mismatch',
            status: 500, // INTERNAL SERVER ERROR
            message: 'expected parameter to be string, got ' + typeof dataType
        };
    } else if (typeof params[key] === 'undefined') {
        throw {
            name: 'validators.key.not.found',
            status: 500,
            message: 'expected "' + key + '" key in object'
        };
    } else if (typeof params[key] !== dataType) {
        throw {
            name: 'validators.mismatch.datatype',
            status: 500,
            message: 'Mismatch data type of "' + key + '", expected ' + dataType + ' got ' + typeof key
        };
    } else {
        return 0;
    }
}

function calculateAge(birthday) { // birthday is a date
    var ageDifMs = Date.now() - birthday.getTime();
    var ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}