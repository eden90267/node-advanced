"use strict";
// co.js

module.exports = function (gen) {
    var hander_error_ = [];

    function flow() {
        var iter_ = gen();
        var next_ = function next_(data) {
            var result = iter_.next(data);
            if (!result.done) {
                result.value.then(function (data) {
                    next_(data);
                }).catch(function (err) {
                    hander_error_.forEach(function (handler) {
                        if (typeof handler == 'function') {
                            handler(err);
                        }
                    });
                });
            }
        };
        process.nextTick(function () {
            try {
                next_();
            } catch (err) {
                hander_error_.forEach(function (handler) {
                    if (typeof handler == 'function') {
                        handler(err);
                    }
                });
            }
        });
        return flow;
    }

    Object.defineProperty(flow, 'catch', {
        enumerable: false,
        value: function value(handler) {
            if (typeof handler == 'function') {
                hander_error_.push(handler);
            }
            return flow;
        }
    });
    return flow;
};