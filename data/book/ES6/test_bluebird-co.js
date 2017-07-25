"use strict";
// test_co.js
let fs = require('fs');
let Promise = require('bluebird');
var Thread = require('node-threadobject');
var co = Promise.coroutine;
var thread = new Thread();
let readdirAsync = Promise.promisify(fs.readdir, fs);
let delayBySecAsync = Promise.promisify(thread.delayBySec, thread);
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