"use strict";
// test_co.js

var fs = require('fs');
var Promise = require('bluebird');
var Thread = require('node-threadobject');
var co = Promise.coroutine;
var thread = new Thread();
var readdirAsync = Promise.promisify(fs.readdir, fs);
var delayBySecAsync = Promise.promisify(thread.delayBySec, thread);
var hco = co(regeneratorRuntime.mark(function _callee() {
    var ret;
    return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                    console.log('co begin');
                    console.log('Wait by 1 sec, then print current directory');
                    _context.next = 4;
                    return delayBySecAsync(1);

                case 4:
                    _context.next = 6;
                    return readdirAsync(__dirname);

                case 6:
                    ret = _context.sent;

                    console.log(ret);
                    throw new Error('An error has been intentionally throwed');

                case 10:
                case 'end':
                    return _context.stop();
            }
        }
    }, _callee, this);
}));
hco().catch(function (e) {
    console.error(e);
});