"use strict";
require('babel-polyfill'); // ES6 generator support in Babel
let Promise = require('bluebird');
let co = Promise.coroutine;
let fs = require('fs');
let Thread = require('node-threadobject');
let thread = new Thread();
let readdirAsync = Promise.promisify(fs.readdir, fs);
let delayBySecAsync = Promise.promisify(thread.delayBySec, thread);
console.log('program start');
let hco = co(function* () {
    console.log('co begin');
    let ret = yield readdirAsync(__dirname);
    console.log(ret);
    yield delayBySecAsync(1);
    console.log('co end');
});
hco().catch(function (e) {
    console.error(e);
});
console.log('hco end');