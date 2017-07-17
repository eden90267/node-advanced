'use strict';

let assert = require('assert');
let istanbul = require('istanbul');
let hook = istanbul.hook,
    sqrtMatcher = function (file) {
        return file.match(/sqrt/);
    },
    sqrtTransformer = function (code, file) {
        return code + '\n module.exports.check = function(x) { return check(x); }';
    };
hook.hookRequire(sqrtMatcher, sqrtTransformer);
let sqrt = require('./../lib/sqrt').sqrt;
let check = require('./../lib/sqrt').check;

describe('#sqrt()', function () {
    it('#sqrt(4) should equal 2', function () {
        assert.equal(sqrt(4), 2);
    });
    it('#sqrt(-1) should throw an Error', function () {
        assert.throws(function () {
            sqrt(-1);
        });
    });
});
// 測試非匯出函數check
describe('#check()', function () {
    it('should be false when < 0', function () {
        assert.ifError(check(-1));
    });
});