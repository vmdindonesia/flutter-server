'use strict';

module.exports = function (Mappingmobilecode) {
  Mappingmobilecode.beforeRemote('create', function (context, user, next) {
    var randomNum = Math.random();
    var expectedNum = Math.floor(randomNum * 10000);
    var stringNum = ('000' + expectedNum).slice(-4);
    console.log('GENERATED CODE : ' + stringNum);
    context.args.data.generatedCode = stringNum;

    next();

  });

  Mappingmobilecode.afterRemote('create', function (context, user, next) {
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

    var mobileNumber = context.args.data.mobileNumber;
    mobileNumber = mobileNumber.trim();
    if (mobileNumber[0] == '+') {
      mobileNumber = mobileNumber.slice(1);
    }

    console.log('THE PHONE NUMBER : ' + mobileNumber);

    var smsGatewayUrl = 'https://secure.gosmsgateway.com/masking/api/send.php?username=flutter&mobile=' + mobileNumber + '&message=Please+input+' + context.args.data.generatedCode + '+on+Flutter+Asia+in+30+minutes.&password=gosms38246';
    httpGetAsync(smsGatewayUrl, function () {
      console.log('HTTP DONE');
      // console.log(smsGatewayUrl);
      next();
    })

  })

};
