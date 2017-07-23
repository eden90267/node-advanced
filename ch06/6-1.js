var fs = require('fs');
var readdir = function () {
    return new Promise(function (resolve, reject) {
        fs.readdir(__dirname, function (err, data) {
            if (err)
                reject(err); // 出錯，將Promise實例置為Rejected
            else
                resolve(data); // 成功，將Promise實例置為Resolved
        });
    });
};
var promise_readdir = readdir();