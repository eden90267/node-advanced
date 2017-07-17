var assert = require('assert');
var fs = require('fs');

describe('Array', function () {
    describe('#indexOf()', function () {
        it('should return -1 when the value is not present', function () {
            assert.equal([1, 2, 3].indexOf(5), -1);
            assert.notEqual([1, 2, 3].indexOf(1), -1);
        })
    })
});
describe('fs', function () {
    describe('#readdir', function () {
        it('should not return error', function (done) {
            fs.readdir(__dirname, function (err) {
                assert.ifError(err);
                done();
            });
        });
    });
});