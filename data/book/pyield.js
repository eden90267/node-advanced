"use strict";

function mapLen(obj) {
    var l = 0;
    for (var key in obj) {
        ++l;
    }
    return l;
}
function Parallel(array, cb) {
    var len = array.length;
    var result = {};
    var error = false;
    for (var i = 0; i < len; ++i) {
        (function (i) {
            var parray = array[i].param.concat();
            parray.push(function (err, data) {
                if (err) error = false;
                result[i] = err ? err : data;
                if (mapLen(result) == len) {
                    var r = [];
                    for (var j = 0; j < len; j++) {
                        r.push(result[j]);
                    }
                    if (error) {
                        cb(r);
                    } else {
                        cb(null, r);
                    }
                }
            });
            if (array[i].obj) {
                array[i].func.apply(array[i].obj, parray);
            } else {
                array[i].func.apply({}, parray);
            }
        })(i);
    }
}

module.exports = {
    parallel: Parallel
};