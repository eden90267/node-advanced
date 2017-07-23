var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

fs.readdirAsync(__dirname)
    .then(function (data) {
        console.log(data);
    }).catch(function (err) {
    console.error(err);
});