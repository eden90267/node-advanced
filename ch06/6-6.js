var fs = require('fs');
var Promise = require('bluebird');
var readdirAsync = Promise.promisify(fs.readdir, fs);
readdirAsync(__dirname)
    .then(function (data) {
        console.log(data);
    }).catch(function (err) {
        console.error(err);
    });