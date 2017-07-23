var fs = require('fs');
var readdir = function () {
    return new Promise(function (resolve, reject) {
        fs.readdir(__dirname, function (err, data) {
            if (err)
                reject(err);
            else
                resolve(data);
        });
    });
};
var delayByMil = function (data) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve(data);
        }, 1000);
    });
};

readdir()
    .then(function (data) {
        console.log('第一個非同步呼叫的結果');
        console.log(data);
        return delayByMil(data[0]); // 將結果作為參數傳給下一級Promise實例
    })
    .then(function (data) {
        console.log('第二個非同步呼叫的結果');
        console.log(data); // 一秒鐘後，列印出data[0]的值
    })
    .catch(function (err) {
        console.error(err);
    });
