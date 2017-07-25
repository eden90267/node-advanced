"use strict";
let iter = (function* () {
    yield "hello world";
})();
console.log(iter.next());