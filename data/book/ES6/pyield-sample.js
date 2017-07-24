"use strict";
require('babel-polyfill'); // ES6 generator support in Babel
let Promise = require('bluebird');
var co = Promise.coroutine;
var Redis = require('ioredis');
let pyield = require('pyield');
let redis = new Redis({
    port: 6379,
    host: '127.0.0.1'
});
let parallelAsync = Promise.promisify(pyield.parallel, pyield);
let hco = co(function* () {
    redis.set('a', 'hello a');
    redis.set('b', 'hello b');
    redis.set('c', 'hello c');
    let allrel = yield parallelAsync([
        {obj: redis, func: redis.get, param: ['a']},
        {obj: redis, func: redis.get, param: ['b']},
        {obj: redis, func: redis.get, param: ['c']},
    ]);
    console.log(allrel);
});
hco().then(function () {

}).catch(function (e) {
    console.error(e);
});