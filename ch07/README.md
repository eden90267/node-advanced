# Chap07. 用ES6 Generator解決回呼金字塔

## Node非同步實現流程

使用Node撰寫業務邏輯，由於它非同步的呼叫方式，回呼的多層巢狀結構增加了程式的複雜性。回呼多層巢狀結構之後，程式看起來支離破碎。這種為了實現一個完整處理流程而不斷加深回呼層次的程式結構，有一個具體的稱呼，叫做回呼金字塔。

我們急需一種最好是和同步式編碼形式一致的方法撰寫非同步邏輯，也就是將實際是非同步執行的流程在形式上寫成同步的。同步執行符合我們的思維習慣，利於閱讀、修改和定位。本章介紹一種通用方式——以ES
6 Generator實現我們為基礎的目標。

## 用Generator實現非同步呼叫與多平行處理

從形式上看，Generator是用function*(){}定義的一段程式區塊，與函數類似。它配合ES6引用的關鍵字yield使用。它的基本用法用下面的實例可以說明：

```js
"use strict";
require('babel-polyfill'); // ES6 generator support in Babel
let Promise = require('bluebird');
let co = Promise.coroutine;
let fs = require('fs');
let Thread = require('node-threadobject');
let thread = new Thread();
let readdirAsync = Promise.promisify(fs.readdir, fs);
let delayBySecAsync = Promise.promisify(thread.delayBySec, thread);
console.log('program start');
let hco = co(function* () {
    console.log('co begin');
    let ret = yield readdirAsync(__dirname);
    console.log(ret);
    yield delayBySecAsync(1);
    console.log('co end');
});
hco().catch(function (e) {
    console.error(e);
});
console.log('hco end');
```

可使用之前介紹的容器執行上述程式。以上程式在*book/ES6/first_es6.js*。並在book目錄下新增一個檔案*gulpfile.js*：

```js
var gulp = require('gulp');
var babel = require('gulp-babel');
gulp.task('test', function () {
    return gulp.src('./ES6/*js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('./'));
});
gulp.task('default', ['test']);
```

gulp會呼叫gulp-babel模組，將包含有function*、yield這些ES6標準下的程式編譯成ES5的標準。
除此之外，gulpfile.js還可以require其他模組，完成不同工作：

```js
var sass = require('gulp-sass'),             // 把sass檔案編譯成css
    uglify = require('gulp-uglify'),         // 壓縮JavaScript檔案
    cssminify = require('gulp-minify-css'),  // 壓縮css檔案
    htmlmin = require('gulp-htmlmin'),       // 壓縮HTML檔案
    ts = require('gulp-typescript');         // 編譯ts檔案
var img64 = require('gulp-imgbase 64');      // 將html檔案img的src屬性取代為data url
```

gulp支援自動化建置，它有一個watch方法，可以指定監控某些路徑，一旦檔案有變化，就執行對應的回呼函數。可透過以下的shell指令稿，啟動並監控gulp處理程序。

```bash
#!/bin/bash
while true
do
    procnum=$(ps -ef|grep -w "gulp"|grep -v grep|wc -l)
    if [ $procnum -eq 0 ];then
        gulp watch > gulp.dat &
    fi
    sleep 1
done
```

將這檔案存為*gulpmon.sh*，放到與gulpfile.js相同的目錄下，然後執行`./gulpmon.sh`。它自動啟動gulp服務，並監控這個處理程序的執行狀態。

執行`first_es6.js`：

```sh
$ docker exec fc7 sh -c "node /root/book/first_es6.js"
program start
co begin
hco end
[ 'ES6',
  'first_es6.js',
  'gulp.dat',
  'gulpfile.js',
  'gulpmon.sh',
  'node_modules',
  'package.json' ]
co end
```

看結果的列印順序。

將上述程式用回呼的方式實現，比較來看。

```js
var fs = require('fs');
var Thread = require('node-threadobject');
var thread = new Thread();
console.log('program start');
console.log('hco begin');
fs.readdir(__dirname, function(err, data) {
  if (err) console.error(err)
  else {
      console.log(data);
      thread.delayBySec(1, function(err) {
        if (err) console.error(err);
        else {
            console.log('co end');
        }
      });
  }
});
console.log('hco end');
```

使用Generator，回呼的寫法被展平，非同步執行的程式可以在形式上寫成同步形式。「以同步之形，行非同步之實」。

程式碼片段中被 co 套件起來的部分，稱為Generator。非同步函數經過Promise.promisify轉換之後，皆可放入Generator內部使用。但非同步函數的參數需要為以下形式：

```js
(p1,p2,...,function(err, data) {
    
})
```

而Generator內部的敘述，可以包含任意複雜的邏輯判斷與循環。接下來，我們看看如何使用Generator平行處理執行非同步過程：

試想，如果前後階段的執行彼此不依賴，那麼使用Generator的工作執行時間為兩個非同步處理時間之和。但處理時間可以更快，因為不依賴，所以工作處理完成的最小時間是兩者單獨處理時間較大的那一個。

這裡將介紹兩種方式，第一種借助於已有的知識實現一個自訂函數，達到並存執行的目的。第二種借助於bluebird提供的功能。以上面介紹為基礎的內容，可以自己寫一個模組，實現多平行處理。想法是寫一個函數，它接收多個非同步函數作為參數，然後同時呼叫。後續負責收集結果。當傳給它的所有非同步函數的回呼都執行了以後，它的非同步過程才算執行完，可以先設想我們的呼叫方式如下：

```js
let allrel = yield parallelAsync([
    {func: func1, param: [p11,p21,...]},
    {func: func2, param: [p21,p22,...]}
]);
console.log(allrel[0]);
console.log(allrel[1]);
```

parallelAsync的參數是一個陣列，其中的每一個物件包含著要執行的非同步函數以及參數。下一步是遵照前述介面，程式如下：

```js
function mapLen(obj) {
    var l = 0;
    for (var key in obj) {
        ++l;
    }
    return l;
}
function Parallel(array, cb) {
    const len = array.length;
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
```

將上述程式除存成檔案pyield.js。下面的程式是使用pyield的實例(_pyield-sample.js_)：

```js
"use strict";
require('babel-polyfill'); // ES6 generator support in Babel
let Promise = require('bluebird');
var co = Promise.coroutine;
var Redis = require('ioredis');
let pyield = require('pyield');
let redis = new Redis({
    port: 6379,
    host: '127.0.0.1'
});
let parallelAsync = Promise.promisify(pyield.parallel, pyield);
let hco = co(function* () {
    redis.set('a', 'hello a');
    redis.set('b', 'hello b');
    redis.set('c', 'hello c');
    let allrel = yield parallelAsync([
        {obj: redis, func: redis.get, param: ['a']},
        {obj: redis, func: redis.get, param: ['b']},
        {obj: redis, func: redis.get, param: ['c']},
    ]);
    console.log(allrel);
});
hco().then(function () {

}).catch(function (e) {
    console.error(e);
});
```

使用gulp編譯上述程式之後執行，結果如下：

```sh
$ node pyield-sample.js
['hello a', 'hello b', 'hello c'];
```

上述程式是一個用來示範的實例。因為Redis本身是單執行緒的，所以真實操作Redis的時間並未縮短。但如果Redis執行在cluster模式下，則可以享受到平行處理存取資料的好處。

第二種方式是借助Promise.all函數實現平行執行。這種方式寫起來就非常簡單明瞭。

```js
"use strict";
require('babel-polyfill'); // ES6 generator support in Babel
let Promise = require('bluebird');
let co = Promise.coroutine;
let fs = require('fs');
let Thread = require('node-threadobject');
let thread = new Thread();
let readdirAsync = Promise.promisify(fs.readdir, fs);
let delayBySecAsync = Promise.promisify(thread.delayBySec, thread);
console.log('program start');
let hco = co(function* () {
    console.log('co begin');
    let ret = yield Promise.all([readdirAsync(__dirname), delayBySecAsync(1)]);
    console.log(ret);
    console.log('co end');
});
hco().catch(function (e) {
    console.error(e);
});
console.log('hco end');
```

Promise.all函數接收一個陣列，這個陣列每一個物件都是Promise實例，這些Promise物件被同時發起，達到平行效果。

## 嚴格模式下執行

之前執行導案前都透過gulp工具將ES6程式先轉為ES5。隨著ES6標準的發佈和Node本身的發展，Node已經可以原生支援ES6標準，包含Generator和yield。執行前不是必須先執行gulp，在JavaScript檔案最開始，增加以下程式：

```js
"use strict";
```

告訴Node以嚴格模式執行程式，然後刪除對babel-polyfill模組的參考。

```js
"use strict";
let Promise = require('bluebird');
let co = Promise.coroutine;
// ...
```

gulp之後產生的檔案，最前面也有以下敘述：

```js
"use strict";
```

嚴格模式消除了之前語法的不嚴謹、不合理的地方，同時也有助解譯器更快地執行我們的程式。

## 了解執行過程

上面的一些程式實例，被co套件起來的部分稱為Generator，它是以以下形式定義的函數：

```js
"use strict";
function* gen() {
  yield 'hello world!';
}
```

執行這個函數會產生一個Generator實例，它的特點是每次執行到yield右側的運算式就不再繼續往下執行。如果要繼續，需要人為地呼叫一次物件的next()方法。next()方法傳回一個物件，其中一個屬性value儲存著yield右側運算式的值。對於剛產生的Generator物件，不會執行任何敘述。因此第一次呼叫next()之後，執行到第一個yield右側的運算式，next()傳回的物件中包含第一個yield右側運算式的值。例如下面的實例：

```js
"use strict";
let iter = (function* () {
    yield "hello world";
})();
console.log(iter.next());
```

執行這個檔案，列印結果如下：

```sh
{ value: 'hello world', done: false }
```

done代表是否執行完畢。如果將某一個物件作為參數呼叫next()方法，則yield左側的運算式被這個物件設定值。

我們熟悉了Generator物件的這種執行方式後，可以設想，使用Generator將非同步流程寫成同步的形式，呼叫next()方法的時機就是回呼函數執行的當口。因為這時候回呼函數接收到的衫既漚是這次非同步呼叫後的結果。將這個結果作為參數呼叫next()，則我們的程式中"yield"左側的變數就被正確設定值，同時開始執行下一個非同步作業。

採用這種方式，從上到下，直到這個Generator物件中被yield分割的每一個部分都執行完畢。

在上面的範例中，使用yield發起的非同步呼叫，我們沒有傳入回呼函數，而是事先用bluebird函數庫的Promise.promisify做了一個處理。Promise.promisify以一個非同步函數作為參數，傳回對應的Promise版本的物件。上節我們提到Promise實例有一個then()方法，呼叫then()方法，開始執行非同步作業，而傳給then()方法的函數用來收集結果。當這個收集函數被呼叫時，代表著非同步過程結束，正好可以趁機呼叫Generator物件的next()方法。

下一步，我們來實現一個以Generator為基礎的將非同步改造為同步形式的擴至函數co()，不依賴bluebird，_co.js_：

```js
"use strict";
// co.js
module.exports = function (gen) {
    var hander_error_ = [];

    function flow() {
        var iter_ = gen();
        var next_ = (data) => {
            var result = iter_.next(data);
            if (!result.done) {
                result.value.then((data) => {
                    next_(data);
                }).catch(function (err) {
                    hander_error_.forEach((handler) => {
                        if (typeof handler == 'function') {
                            handler(err);
                        }
                    });
                });
            }
        };
        process.nextTick(() => {
            try {
                next_();
            } catch (err) {
                hander_error_.forEach((handler) => {
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
        value: function (handler) {
            if (typeof handler == 'function') {
                hander_error_.push(handler);
            }
            return flow;
        }
    });
    return flow;
};
```

上述程式的流程控制函數由我們自己實現，接下來可以撰寫一個使用co.js模組的實例，_test_co.js_：

```js
"use strict";
// test_co.js
let fs = require('fs');
let co = require('./co');
let readdirAsync = (dirname) => {
    return new Promise((resolve, reject) => {
        fs.readdir(dirname, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};
let delayBySecAsync = (secs) => {
    return new Promise((resolve, reject) => {
        setTimeout(function () {
            resolve();
        }, secs * 1000);
    });
};
let hco = co(function* () {
    console.log('co begin');
    console.log('Wait by 1 sec, then print current directory');
    yield delayBySecAsync(1);
    let ret = yield readdirAsync(__dirname);
    console.log(ret);
    throw new Error('An error has been intentionally throwed');
    console.log('co end');
});
hco().catch(function (e) {
    console.error(e);
});
```

以上程式參考了co.js，其他部分的程式與使用bluebird的coroutine時大同小異。執行上面程式：

```sh
$ docker exec fc7 sh -c "node /root/book/ES6/test_co.js"
co begin
Wait by 1 sec, then print current directory
[ 'co.js',
  'first_es6.js',
  'pyield-sample.js',
  'pyield.js',
  'sec_es6.js',
  'test_co.js',
  'thi_es6.js' ]
[Error: An error has been intentionally throwed]
```

上述的流程控制函數考慮了例外處理，test_co.js中的敘述：

```js
throw new Error('An error has been intentionally throwed');
```

故意拋出了一個例外，因此未執行console.log('co
end')，而是跳耀度註冊的例外處理函數。接下來，我們使用bluebird函數庫實現相同功能，對照來看：

```js
"use strict";
// test_co.js
let fs = require('fs');
let Promise = require('bluebird');
var Thread = require('node-threadobject');
var co = Promise.coroutine;
var thread = new Thread();
let readdirAsync = Promise.promisify(fs.readdir, fs);
let delayBySecAsync = Promise.promisify(thread.delayBySec, thread);
let hco = co(function* () {
    console.log('co begin');
    console.log('Wait by 1 sec, then print current directory');
    yield delayBySecAsync(1);
    let ret = yield readdirAsync(__dirname);
    console.log(ret);
    throw new Error('An error has been intentionally throwed');
    console.log('co end');
});
hco().catch(function (e) {
    console.error(e);
});
```

Promise.coroutine實現了流程控制的功能，Promise.promisify將非同步函數轉換成Promise物件。現在，讀者應該能體會bluebird這個Promise函數庫是多麼強大了。