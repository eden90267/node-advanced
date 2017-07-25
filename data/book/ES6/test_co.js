"use strict";
// test_co.js
let fs = require('fs');
let co = require('./co');
let readdirAsync = (dirname) => {
    return new Promise((resolve, reject) => {
        fs.readdir(dirname, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};
let delayBySecAsync = (secs) => {
    return new Promise((resolve, reject) => {
        setTimeout(function () {
            resolve();
        }, secs * 1000);
    });
};
let hco = co(function* () {
    console.log('co begin');
    console.log('Wait by 1 sec, then print current directory');
    yield delayBySecAsync(1);
    let ret = yield readdirAsync(__dirname);
    console.log(ret);
    throw new Error('An error has been intentionally throwed');
    console.log('co end');
});
hco().catch(function (e) {
    console.error(e);
});