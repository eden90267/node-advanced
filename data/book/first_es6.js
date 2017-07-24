"use strict";

require('babel-polyfill'); // ES6 generator support in Babel
var Promise = require('bluebird');
var co = Promise.coroutine;
var fs = require('fs');
var Thread = require('node-threadobject');
var thread = new Thread();
var readdirAsync = Promise.promisify(fs.readdir, fs);
var delayBySecAsync = Promise.promisify(thread.delayBySec, thread);
console.log('program start');
var hco = co(regeneratorRuntime.mark(function _callee() {
    var ret;
    return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                    console.log('co begin');
                    _context.next = 3;
                    return readdirAsync(__dirname);

                case 3:
                    ret = _context.sent;

                    console.log(ret);
                    _context.next = 7;
                    return delayBySecAsync(1);

                case 7:
                    console.log('co end');

                case 8:
                case 'end':
                    return _context.stop();
            }
        }
    }, _callee, this);
}));
hco().catch(function (e) {
    console.error(e);
});
console.log('hco end');