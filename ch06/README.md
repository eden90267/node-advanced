# Chap06. Promise物件

## Promise的含義

這個概念和實現最初來自社區，用於解決非同步程式設計的回呼巢狀結構問題，即**將多級的巢狀結構改良成順序的程式行**。ES6將其寫進了語言標準，統一了用法，提供了原生Promise。

Promise是一個建置函數，用於產生一個Promise實例。**Promise實例代表一次非同步作業**。它只可能有三種狀態：

1. Pending(未決議)
2. Resolved(完成)
3. Rejected(出錯)

當我們建立一個Promise實例的時候，Promise物件處於Pending態。當非同步作業完成，執行回呼函數的時候，根據回呼函數參數中err的值，如果err為空，則表示非同步作業成功，將Promise置為完成態，否則將其置為出錯的狀態。此後，Promise物件的狀態將不會再變。

## 基本用法

以下程式建立一個Promise實例，其代表一次非同步讀取檔案目錄操作：

```js
var fs = require('fs');
var readdir = function () {
    return new Promise(function (resolve, reject) {
        fs.readdir(__dirname, function (err, data) {
            if (err)
                reject(err); // 出錯，將Promise實例置為Rejected
            else
                resolve(data); // 成功，將Promise實例置為Resolved
        });
    });
};
var promise_readdir = readdir();
```

Promise的建置函數接收一個函數作為參數。傳入的這個函數被執行，表示開始發起非同步作業。而它被執行的時機是在建立Promise實例後，**呼叫實例then()方法時**。這個函數接收兩個參數——resolve和reject。resolve()和reject()本身也是函數，由引擎傳入。Resolve()函數的作用是將Promise實例的狀態由Pending轉變為Resolved，並將非同步作業的結果傳遞出去。類似的，reject()函數的作用是將狀態轉變為Rejected，並將錯誤訊息傳出。

Promise實例產生之後，需要用then()方法分別指定Resolved狀態和Rejected狀態的回呼函數。呼叫then()方法的同時，發起非同步請求。

```js
promise_readdir.then(function (data) {
    console.log(data);
}).catch(function (err) {
    console.error(err);
});
```

catch是then的語法糖，相當於：

```js
promise_readdir.then(undefined, function(err) {
  // 錯誤處理
});
```

傳給catch函數在發生錯誤時執行。表示由Pending ->
Rejected，或在傳給then方法的回呼函數中拋出例外。Promise物件的錯誤具有向後傳遞的性質，因此錯誤總能夠被最後一個catch敘述捕捉。

```js
promise_readdir.then(function (data) {
    throw new Error('intentionally throwed');
}).catch(function (err) {
    console.error(err);
});
```

傳給then的回呼函數中拋出例外的情況，最後的catch會捕捉到。

## then的鏈式寫法

then方法定義在一個建置函數Promise的原型物件(Promise.prototype)上。這個方法為Promise實例增加狀態改變時的回呼函數。then方法傳回一個新的Promise實例，因此then()方法後面可以繼續呼叫then()方法。傳給then()方法的函數，可以傳回三大類值，分別如下：

1. 一個Promise實例
2. 一個普通值
3. 拋出一個例外

如果傳回的還是一個Promise實例，則下一級then()接收的函數將在這個Promise實例狀態發生改變時被觸發執行。因此，then()的鏈式寫法，可以按序執行一系列的非同步作業，並且後一個非同步作業在前一個完成之後開始。

```js
var fs = require('fs');
var readdir = function () {
    return new Promise(function (resolve, reject) {
        fs.readdir(__dirname, function (err, data) {
            if (err)
                reject(err);
            else
                resolve(data);
        });
    });
};
var delayByMil = function (data) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve(data);
        }, 1000);
    });
};

readdir()
    .then(function (data) {
        console.log('第一個非同步呼叫的結果');
        console.log(data);
        return delayByMil(data[0]); // 將結果作為參數傳給下一級Promise實例
    })
    .then(function (data) {
        console.log('第二個非同步呼叫的結果');
        console.log(data); // 一秒鐘後，列印出data[0]的值
    })
    .catch(function (err) {
        console.error(err);
    });
````

執行結果：

```sh
$ node 6-5
第一個非同步呼叫的結果
[ '6-1.js', '6-2.js', '6-5.js', 'README.md' ]
第二個非同步呼叫的結果
6-1.js
```

在上面的實例中，傳給第一級then()方法的函數傳回一個新的Promise實例，因此不會立即執行下一級then()方法接收的函數。這個函數只有在傳回Promise實例的狀態變為Resolved之後，才會被觸發執行。把上一級非同步呼叫的結果作為參數傳給下一級的Promise實例，即藉由then()的鏈式寫法，解決了回呼函數多層巢狀結構的問題。最後的catch()方法用於例外處理。

## bluebird函數庫

bluebird是Promise的實現。比起引擎提供的原生方案，使用bluebird提供的Promise能在執行多個JavaScript環境下，甚至支援在舊版本的IE瀏覽器中執行。它提供非常實用的工具類別函數，幫助我們快速產生Promise物件。在效率上，被認為是所有Promise函數庫中最快的。

```js
var fs = require('fs');
var Promise = require('bluebird');
var readdirAsync = Promise.promisify(fs.readdir, fs);
readdirAsync(__dirname)
    .then(function (data) {
        console.log(data);
    }).catch(function (err) {
        console.error(err);
    });
```

上面的程式中Promise代表引用的bluebird模組，其promisify()方法傳回包裝了對應非同步函數的Promise物件。bluebird還提供一個promisifyAll()方法，可以一次性處理物件包含的每一個非同步函數，產生其對應的Promise物件，名稱為原方法名稱後面加Async：

```js
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

fs.readdirAsync(__dirname)
    .then(function (data) {
        console.log(data);
    }).catch(function (err) {
    console.error(err);
});
```

同樣，檔案模組下其他的非同步函數也都按照這種規則產生了對應的Promise。