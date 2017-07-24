"use strict";

require('babel-polyfill'); // ES6 generator support in Babel
var Promise = require('bluebird');
var co = Promise.coroutine;
var Redis = require('ioredis');
var pyield = require('pyield');
var redis = new Redis({
    port: 6379,
    host: '127.0.0.1'
});
var parallelAsync = Promise.promisify(pyield.parallel, pyield);
var hco = co(regeneratorRuntime.mark(function _callee() {
    var allrel;
    return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                    redis.set('a', 'hello a');
                    redis.set('b', 'hello b');
                    redis.set('c', 'hello c');
                    _context.next = 5;
                    return parallelAsync([{ obj: redis, func: redis.get, param: ['a'] }, { obj: redis, func: redis.get, param: ['b'] }, { obj: redis, func: redis.get, param: ['c'] }]);

                case 5:
                    allrel = _context.sent;

                    console.log(allrel);

                case 7:
                case 'end':
                    return _context.stop();
            }
        }
    }, _callee, this);
}));
hco().then(function () {}).catch(function (e) {
    console.error(e);
});