'use strict';

module.exports = function (Memberphoto) {

    Memberphoto.observe('before save', function (ctx, next) {
        console.log(ctx.instance);
        var tmp = ctx.instance.src;
        ctx.instance.src = null;
        ctx.instance.srcTmp = tmp;
        next();
    });

};
