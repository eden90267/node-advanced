# TOC
   - [Array](#array)
     - [#indexOf()](#array-indexof)
   - [fs](#fs)
     - [#readdir](#fs-readdir)
<a name=""></a>
 
<a name="array"></a>
# Array
<a name="array-indexof"></a>
## #indexOf()
should return -1 when value is not present.

```js
assert.equal(-1, [1, 2, 3].indexOf(4));
```

lists the use of these assert methods.

```js
var testarr1 = [1, 2, '3'];
var testarr2 = [1, 2, 3];
var testarr3 = [1, 2, 4];
assert.ok([]); //斷言為真
assert.equal(1, '1'); // 斷言相等
assert.notEqual(1, 2); // 斷言不相等
assert.strictEqual(1, 1); // 斷言嚴格相等
assert.notStrictEqual(1, '1'); // 斷言嚴格不相等
assert.deepEqual(testarr1, testarr2); // 斷言深度相等
assert.notDeepEqual(testarr1, testarr3); // 斷言深度不相等
assert.throws(function (err) {
    throw new Error('throw err intentionally');
}); // 斷言程式區塊拋出例外
assert.doesNotThrow(function (err) {
}); // 斷言程式區塊不泡例外
assert.ifError(false); // 斷言值為假——false, null, undefined, 0, '', NaN
```

<a name="array"></a>
# Array
<a name="array-indexof"></a>
## #indexOf()
should return -1 when not present.

```js
assert.equal(-1, [1, 2, 3].indexOf(4));
```

<a name="array"></a>
# Array
<a name="array-indexof"></a>
## #indexOf()
should return -1 when the value is not present.

```js
assert.equal([1, 2, 3].indexOf(5), -1);
assert.notEqual([1, 2, 3].indexOf(1), -1);
```

<a name="fs"></a>
# fs
<a name="fs-readdir"></a>
## #readdir
should not return error.

```js
fs.readdir(__dirname, function (err) {
    assert.ifError(err);
    done();
});
```

