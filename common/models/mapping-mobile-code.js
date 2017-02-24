'use strict';

module.exports = function (Mappingmobilecode) {
  Mappingmobilecode.beforeRemote('create', function (context, user, next) {
    console.log('AAAAA');
    var randomNum = Math.random();
    var expectedNum = Math.floor(randomNum * 10000);
    var stringNum = ('000' + expectedNum).slice(-4);
    console.log(stringNum);
    context.args.data.generatedCode = stringNum;

    next();

  });

  Mappingmobilecode.afterRemote('create', function (context, user, next) {
    console.log(context.args.data);
    function httpGetAsync(theUrl, callback) {
      var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
          callback(xmlHttp.responseText);
      }
      xmlHttp.open("GET", theUrl, true); // true for asynchronous 
      xmlHttp.send(null);
    }
    console.log('AFTER REMOTE');

    var smsGatewayUrl = 'http://secure.gosmsgateway.com:8080/masking/api/send.php?username=flutter&mobile=' + context.args.data.mobileNumber + '&message=Harap+masukkan+' + context.args.data.generatedCode + '+di+Aplikasi+Flutterasia+dalam+30+menit.&password=gosms38246';
    httpGetAsync(smsGatewayUrl, function () {
      console.log('HTTP DONE');
      console.log(smsGatewayUrl);
      next();
    })

  })

};
