'use strict';

module.exports = function (Devicetokenmapping) {

    Devicetokenmapping.remoteMethod('registerToken', {
        description: 'Registering Device Token from User',
        http: { verb: 'post' },
        accepts: [
            { arg: 'userId', type: 'number', required: true },
            { arg: 'token', type: 'string', required: true, description: 'Token get from push service' }
        ],
        returns: { arg: 'result', type: 'object', description: 'Object of Device Token Mapping' }
    });

    Devicetokenmapping.remoteMethod('getUserToken', {
        description: 'Get User Token, by sending userId',
        http: { verb: 'post' },
        accepts: { arg: 'userId', type: 'number', required: true },
        returns: { arg: 'result', type: 'string', description: 'User Token, type string' }
    });

    Devicetokenmapping.remoteMethod('removeToken', {
        description: 'UnRegistering Device Token from User',
        http: { verb: 'post' },
        accepts: { arg: 'token', type: 'string', required: true, description: 'Token get from push service' },
        returns: { arg: 'result', type: 'object', description: 'Object of Device Token Mapping' }
    });

    Devicetokenmapping.registerToken = function (userId, token, cb) {
        console.log('CEK APAKAH USER SUDAH PUNYA TOKEN');
        Devicetokenmapping.findById(userId, function (error, result) {
            if (error) {
                cb(error);
            } else {
                var dateNow = new Date();
                if (result) {
                    console.log('USER SUDAH PUNYA TOKEN');
                    if (result.token != token) {
                        console.log('TOKEN YANG MAU DIREGISTER BERBEDA');
                        Devicetokenmapping.updateAll({ id: userId }, {
                            token: token,
                            updateAt: dateNow
                        }, function (error, result) {
                            if (error) {
                                cb(error);
                            } else {
                                console.log('UPDATE TOKEN BERHASIL');
                                cb(null, result);
                            }
                        });
                    } else {
                        console.log('TOKEN YANG MAU DIREGISTER SUDAH BENAR');
                        cb(null, result);
                    }
                } else {
                    console.log('USER BELUM TERDAFTAR TOKENNYA');
                    console.log('MENGECEK TOKEN APAKAH SUDAH ADA USER YANG PAKAI TOKEN TSB');
                    Devicetokenmapping.findOne({
                        where: {
                            token: token
                        }
                    }, function (error, result) {
                        if (error) {
                            cb(error)
                        } else {
                            if (result) {
                                console.log('SUDAH ADA USER YANG REGISTER DENGAN TOKEN INI');
                                Devicetokenmapping.deleteById(result.id, function (error, result) {
                                    if (error) {
                                        cb(error);
                                    } else {
                                        console.log('USER BERHASIL DIHAPUS');
                                        Devicetokenmapping.create({
                                            id: userId,
                                            token: token,
                                            createAt: dateNow,
                                            updateAt: dateNow
                                        }, function (error, result) {
                                            if (error) {
                                                cb(error);
                                            } else {
                                                console.log('BERHASIL MENDAFTARKAN USER');
                                                cb(null, result);
                                            }
                                        });
                                    }

                                })
                            } else {
                                console.log('TOKEN BELUM ADA YANG PUNYA');
                                Devicetokenmapping.create({
                                    id: userId,
                                    token: token,
                                    createAt: dateNow,
                                    updateAt: dateNow
                                }, function (error, result) {
                                    if (error) {
                                        cb(error);
                                    } else {
                                        console.log('BERHASIL DIBUATKAN');
                                        cb(null, result);
                                    }
                                });
                            }
                        }
                    })
                }
            }
        })

    }

    Devicetokenmapping.getUserToken = function (userId, cb) {
        Devicetokenmapping.findById(userId, function (error, result) {
            if (error) {
                cb(error);
            } else {
                if (result) {
                    cb(null, result.token);
                } else {
                    var error = {
                        code: 'user.not.found',
                        message: 'User Not Found'
                    };
                    cb(error);
                }
            }
        })
    }

    Devicetokenmapping.removeToken = function (token, cb) {
        Devicetokenmapping.findOne({
            where: {
                token: token
            }
        }, function (error, result) {
            if (error) {
                cb(error);
            } else {
                if (result) {
                    Devicetokenmapping.deleteById(result.id, function (error, result) {
                        if (error) {
                            cb(error);
                        } else {
                            cb(null, result);
                        }
                    });
                }
            }
        })
    }

};
