"use strict";

var http = require('http');
var options = {
    host: 'cnodejs.prg',
    post: 80,
    path: '/',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};
var req = http.request(options);
req.once('response', (res) => {
    var result = '';
    res.on('data', function (chunk) {
        result += chunk.toString();
    });
    res.on('end', function () {
        console.log(result);
    });
});
req.on('error', (e) => {
    console.error(e.message);
});
req.end();