# 附錄A. JavaScript嚴格模式

嚴格模式消除了一些不確定的行為，並且對某些不安全的操作拋出例外。它有助於解析引擎，最佳化程式，加強執行速度，也為以後新標準的制定留出空間。

## 啟用嚴格模式

```js
"use strict";
```

or

```js
'use strict';
```

## 嚴格模式帶來的變化

在語法和行為這兩方面，嚴格模式都做了一些改變。這些變化主要分為以下幾種：

- 對錯誤拋出例外，而非預設地忽略
- 簡化變數的作用，去掉引擎難以最佳化的語法功能
- 簡化eval和arguments的使用
- 增加安全特性
- 為JavaScript迎接新標準做準備

### 1. 對錯誤拋出例外，而非預設地忽略。

嚴格模式將過去那些能夠被預設忽略的錯誤變成例外拋出，因為這種錯誤代表程式目的的矛盾。

1. 正常模式下，對一個沒有宣告的變數設定值，會自動作用到全域物件上(Node的global物件，瀏覽器的window物件)。嚴格模式禁止這種作法，以避免意外地修改全域物件。

   拋出類型ReferenceError例外。

2. 正常模式下，引擎會忽略對NaN設定值的錯誤。但在嚴格模式下，引擎會以拋例外的方式。類似的還有替一個指定為不寫入的屬性設定值，對只有取值函數getter的屬性設定值，給一個不可擴充的物件增加屬性。

    ```js
    "use strict";

    NaN = 'a';
    
    var obj1 = {};
    Object.defineProperty(obj1, 'x', {value: 42, writable: false});
    obj1.x = 9;
    
    var obj2 = { get x() {return 17;} };
    obj2.x = 5;
    
    var fixed = {};
    Object.preventExtensions(fixed);
    fixed.newProp = 'ohai';
    ```

3. 嚴格模式禁止刪除一個宣告為不可刪除的屬性

    ```js
    "use strict";
    delete Object.prototype;
    ```

4. 嚴格模式禁止宣告名稱重複屬性

    ```js
    "use strict";
    var o = {p:1, p:2};
    ```

5. 嚴格模式規定，函數參數的名稱必須唯一，否則拋出語法錯誤。在正常模式下，相同名稱的參數，位置最靠後的會把前面的隱藏，但所有參數仍可以藉由arguments[i]存取，因此這種隱藏意義不大，很可能寫錯了。
6. 八進位數的寫法。ECMAScript
   5標準下的嚴格模式禁止八進位數，但在ECMAScript
   6標準下，八進位數前面需要加0o。Node支援前面加0o的八進位數。

    ```js
    "use strict";
    // Right
    var a = 0o10; // ES6: Octal
    console.log(a);
    ```

7. 嚴格模式禁止為基底資料型態增加屬性，以下為操作非法：

    ```js
    (function() {
        'use strict';
        false.true = '';
        (14).sailing = 'home';
        'with'.you = 'far away'
    })();
    ```

### 2. 簡化變數的使用，去掉引擎難以最佳化的語法功能

1. 嚴格模式禁止使用with。with的問題在於，其敘述內部的變數名稱只有在執行的時候才能夠被決定，這使得引擎在編譯階段難以產生高效的程式。因為with程式區塊中的名稱既有可能代表敘述內部的變數，也有可能是with運算式中物件的屬性，還有可能位於程式區塊外，甚至是全域物件的屬性。

    ```js
    "use strict";
    var x = 17;
    with (obj)
    {
        x;
    }
    ```

2. 嚴格模式下，eval有單獨的作用域，不能夠使用eval敘述在它之外建立變數。正常模式下，敘述eval('var
   x;')會為它所在的執行環境宣告一個變數x，嚴格模式下，x只在eval敘述內部有效。

    ```js
    "use strict";
    var x= 17;
    var evalX = eval("'use strict'; var x = 42; x");
    console.assert(x === 17);
    console.assert(evalX === 42);
    ```

3. 嚴格模式禁止刪除變數

    ```js
    "use strict";
    var x;
    delete x;
    eval ('var y; delete y;');
    ```

### 3. 簡化eval和arguments的使用

嚴格模式將eval和arguments的一些怪異和奇特的用法作了限制，並偏好將eval和arguments當作關鍵字處理。

1. 嚴格模式不允許對eval和arguments設定值。

    ```js
    "use strict";
    eval = 17;
    arguments++;
    ++eval;
    var obj = { set p(arguments) {} }
    var eval;
    try {} catch(arguments) {}
    function x(eval) {}
    function arguments() {}
    var y = function eval() {};
    var f = new Function("arguments", "'use strict'; return 17;");
    ```

2. 在嚴格模式下，修改函數參數不會影響arguments，下面的範例程式能夠正常執行

    ```js
    function f(a) {
      "use strict";
      a = 42;
      return [a, arguments[0]];
    }
    var pair = f(17);
    console.assert(pair[0] === 42);
    console.assert(pair[1] === 17);
    ```

3. arguments.callee不能再使用了。正常模式下，arguments.callee傳回正在執行的函數本身的參考。在嚴格模式下，這種用法被禁止。

    ```js
    "use strict";
    var f = function() { return arguments.callee; }
    f();
    ```

### 4. 增加安全特性

在嚴格模式下，寫出安全的程式變得更容易，引擎不會越俎代庖，除非使用者有意地這樣做。

1. 嚴格模式下，函數的上下文物件this可以是簡單值，並且避免了對全域物件的參考。在正常情況下，this只能是一個物件，例如下面的程式：

    ```js
    function f(a) {
      console.log(this);
    }
    f.call(true); // [Boolean: true]
    ```

   引擎會自動地將簡單類型包裝為對應的物件。但嚴格模式不會做這樣的轉換。

    ```js
    "use strict";
    function f(a) {
      console.log(this);
    }
    f.call(true); // true
    ```

    正常模式下，如果不指定this物件，或指定為undefined或null，則this參考的是全域物件。

    ```js
    function f(a) {
      console.log(this);
    }
    f.call(null);
    ```

    上面的程式印出全域的global物件。但在嚴格模式下，除非使用call或apply明確指定this為global物件，否則this為null或undefined。

    ```js
    'use strict';
    function f(a) {
      console.log(this);
    }
    f.call(null); // null
    f();          // undefined
    ```

2. 嚴格模式禁止存取函數物件屬性caller和arguments，這表示不再可能檢查堆疊了。

    ```js
    'use strict';
    function outer() {
      inner();
    }
    function inner() {
      console.log(arguments.callee.caller);
    }
    outer();
    ```

### 5. 保留關鍵字

嚴格模式將implements、interface、let、package、private、protected、public、static、yield作為保留字，使用者程式不能以這些名稱命名參數。