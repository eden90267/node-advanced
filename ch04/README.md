# Chap04. Node模組

**模組是Node組織應用程式的單元**。本章介紹Node載入模組的機制和匯出物件的不同方法以及注意事項。

## 程式入口

了解Node模組的載入過程，有助從巨觀上把握一個Node伺服器程式是如何組織起來的。首先編輯一個hello.js檔案：

```js
(function () {
    console.log('hello world!');
});
```

在命令列下執行`node
hello.js`。Node在啟動的時候，根據第二個參數載入JavaScript檔案並執行(node是第一個參數)。Node沒有C++或Java那樣的main函數，但hello.js如main函數一樣，是服務端程式執行的總入口。

## VM模組

編輯兩個JavaScript檔案：

_a.js_：

```js
(function () {
    console.log('hello world~');
});
```

_main.js_：

```js
const vm = require('vm');
const fs = require('fs');
const path = require('path');

var prt = path.resolve(__dirname, '.', 'a.js');

function stripBOM(content) {
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    return content;
}

var wrapper = stripBOM(fs.readFileSync(prt, 'utf8'));
var compiledWrapper = vm.runInThisContext(wrapper, {
    filename: prt,
    lineOffset: 0,
    displayErrors: true
});
compiledWrapper();
```

執行這個檔案：

```sh
$ node main.js
hello world~
```

可見使用VM模組就能直接執行JavaScript檔案。在使用require載入指令稿的時候，Node內部也是如此讀取、編譯、執行JavaScript檔案。

## 模組載入與快取

用Node撰寫程式，一個JavaScript檔案對應一個模組，在module.js檔案中，其建置函數定義如下：

```js
function Module(id, parent) {
  this.id = id;
  this.exports = {};
  this.parent = parent;
  if (parent && parent.children){
      parent.children.push(this);
  }
  this.filename = null;
  this.loaded = false;
  this.children = [];
}
```

Node載入一個JavaScript檔案時，會先建置一個Module物件：

```js
var module = new Module(filename, parent);
```

然後讀取JavaScript程式並對檔案進行頭尾包裝。之後，JavaScript檔案裡面的程式變成這個匿名函數內部的敘述。

```js
(function (exports, require, module, _filename, _dirname) {
    // 原始檔案內容
});
```

上述形式的程式實際上是一個函數字面常數，也就是定義了一個匿名的函數運算式。Node使用V8編譯並執行上面的程式，也就是對以上運算式求值，其值是一個函數物件。V8將結果傳給Node。

```js
var fn = (function(){}); // 右側運算式的值是一個函數物件
```

Node獲得傳回的函數物件，使用函數物件的apply方法，指定上下文，以：

```
module.exports
require
module
_filename
_dirname
```

作為參數，執行函數，開始執行JavaScript檔案內部的程式。

```js
var args = [this.exports, require, this, filename, dirname];
var result = compiledWrapper.apply(this.exports, args);
```

其原始程式可知，JavaScript檔案執行的上下文環境是module.exports，因此在檔案中，也可以直接使用this匯出物件。一個檔案一旦載入之後，其對應的模組被快取。其他檔案在require的時後，直接取快取。

```js
var cachedModule = Module._cache[filename];
if (cachedModule) {
    return cachedModule.exports;
}
```

## 模組分類

Node.js模組可以分為3大類。

1. V8本身支援的物件，例如Data、Math等，這些是語言標準定義的物件，由V8直接提供。
2. Node作為JavaScript執行時期環境，提供了豐富的API，實現這些API的C++函數和JavaScript程式，在Node初始化的時候被載入，這部分模組為原生模組。對於JavaScript程式部分，編譯執行完快取在NativeModule._cache中。快取的程式在bootstrap_node.js中。bootstrap_node.js是Node最先執行的一段JavaScript程式，檔案表表頭有這樣的一個注釋：

    ```js
    // Hello, and welcome to hacking Node.js!
    // This file is invoked by Node::LoadEnvironment in src/Node.cc, and is
    // responsible for bootstrapping the Node.js core. As special caution is given
    // to the performance of the startup process, many dependencies are invoked
    // lazily.
    ```

    這個標頭檔案包含以下程式：

    ```js
    run(Module.runMain);
    ```

   可見，主模組在這裡被載入執行，Module.runMain在Module.js中定義如下：

   ```js
   Module.runMain = function() {
       Module._load(process.argv[1], null, true);
       process._tickCallback();
   }
   ```

   執行到這裡，使用者的入口檔案開始載入。

3. 使用者的JavaScript檔案以及NPM安裝的模組，根據上面的討論，這些指令檔模組對應Module建置出的物件。require函數由Module.prototype.require定義，載入之後模組快取在Module._cache。
