module.exports.sqrt = function (x) {
    if (x >= 0) {
        return Math.sqrt(x);
    } else {
        throw new Error('x < 0');
    }
};
function check(x) {
    return x < 0 ? false : true;
}