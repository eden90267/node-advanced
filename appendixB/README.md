# AppendixB. JavaScript編碼標準

下面的內容主要在於「臉面」，也就是一些使程式看上去優美，讓別人讀起來舒服些的標準。

## 程式格式

1. 使用兩個空格的縮排，不要用tab縮排。幾乎所有的編輯器支援將tab取代為空格。有些編輯器預設使用4個空格取代tab，但過多空格容易使程式左邊區域出現大片空白，內容過於向右側延伸，給閱讀帶來不便。無法忍受的是空格與tab混用。
2. 使用UNIX風格的換行，每行結尾以(\n)結束，永遠不要使用Windows的分行符號(\r\n)。

    這條似乎禁止我們在Windows下撰寫程式。但實際情況沒那麼糟糕，因為Git在傳送的時候會將分行符號自動轉為UNIX風格。

3. 行末無空白。在傳送程式前，應清除行末的空格。不然這種疏忽會使貢獻者和合作者認為編碼不夠標準。
4. 使用分號。

   雖然JavaScript可以像Python那樣，用換行作為敘述的界線。但我們建議，哪怕是只有一行的程式，也不要省略分號。不要濫用校正機制(省略分號)。

5. 每行最多80個字元

    雖然螢幕這幾年越來越大，但可以讓多餘的空間用於切割畫面。

6. 使用單引號而非雙引號

    這除了使程式更加簡潔，在前端領域，這樣做也是非常必要的。

7. 在同一行寫大括號

    ```js
    if (true) {
      console.log('winning');
    }
    ```

    錯誤：

    ```js
    if (true)
    {
      console.log('winning');
    }
    ```

    這是為了使程式看起來不至於過於稀疏。

8. 每行宣告一個變數

   每個var只宣告一個變數，這樣可以更容易地重新排序。並且變數應該在更有意義的地方宣告。

## 命名標準

1. 使用字首小寫給變數、屬性和函數命名

    使用lowerCamelCase(自首小寫)，名稱也應該是描述性的。一般應避免使用單字元變數和不常見的縮寫。

2. 類別名字首大寫
3. 常數全部大寫

## 變數

物件和陣列的建立

正確：

```js
var a = ['hello', 'world'];
var b = {
  good: 'code',
  'is generally': 'pretty'
};
```

錯誤：

```js
var a = [
  'hello', 'world'
];
var b = {"good": 'code'
        , is generally: 'pretty'
        };
```

使用尾隨逗點，把短的宣告為一行。不要用引號將鍵名括起來，除非含有空格這種引擎無法正確解析的字元。

## 條件陳述式

1. 使用===而非==
2. 使用多行三元運算子

    ```js
    var foo = (a === b)
      ? 1
      : 2;
    ```

    三元運算子寫成多行容易修改

3. 使用描述性的條件

    正確：

    ```js
    var isValidPassword = password.length >= 4 && /^(?=.*\d).{4,}$/.test(password);
    if (isValidPassword) {
      console.log('winning');
    }
    ```

    錯誤：

    ```js
    if (password.length >= 4 && /^(?=.*\d).{4,}$/.test(password)) {
      console.log('winning');
    }
    ```

    任何判斷條件應該有一個描述性的變數名稱或函數名稱

## 函數

1. 寫小而短的函數

   把函數寫的短一點。方便別人閱讀，程式也顯得簡潔。

2. 儘早從函數傳回

    正確：

    ```js
    function isPercentage(val) {
      if (val < 0) {
        return false;
      }
      if (val > 100) {
        return false;
      }
      return true;
    }
    ```

    錯誤：

    ```js
    function isPercentage(val) {
      if (val >= 0){
        if (val < 100) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
    ```

    應該儘早地傳回，避免if敘述巢狀結構太深。

3. 為閉包起一個名字

    正確：

    ```js
    req.on('end', function onEnd() {
      console.log('winning');
    });
    ```

    錯誤：

    ```js
    req.on('end', function () {
      console.log('losing');
    });
    ```

   隨時給閉包命名，這樣能產生更清楚的堆疊追蹤、堆和CPU的分析報告。

4. 不要巢狀結構閉包

    正確：

    ```js
    setTimeout(function () {
      client.connect(afterConnect);
    }, 1000);
    function afterConnect() {
      console.log('winning');
    }
    ```

    錯誤：

    ```js
    setTimeout(function () {
      client.connect(function () {
        console.log('winning');
      });
    }, 1000);
    ```

    使用閉包，但別巢狀使用，不然程式會很雜亂。

5. 方法鏈

    正確：

    ```js
    User
      .findOne({name: 'foo'})
      .populate('bar')
      .exec(function(err, user) {
        return true;
      });
    ```

    錯誤：

    ```js
    User
    .findOne({name: 'foo'})
    .populate('bar')
    .exec(function(err, user) {
      return true;
    });
    User.findOne({name: 'foo'})
      .populate('bar')
      .exec(function(err, user) {
        return true;
      });
    User.findOne({name: 'foo'}).populate('bar')
    .exec(function(err, user) {
      return true;
    });
    User.findOne({name: 'foo'}).populate('bar')
      .exec(function(err, user) {
        return true;
      });
    ```

   如果使用方法鏈，確保每行只呼叫一個方法。並且要合理使用縮排，以清楚表明這些並列的方法。

## 註釋

使用雙斜線註釋，用英文寫註釋，不要帶中文字元。

## 其他要注意的雜項

1. 禁用Object.freeze、Object.preventExtensions、Object.seal、with、eval，這些函數盡量少用
2. 將依賴模組寫在檔案開頭
3. 不要擴充JavaScript原生物件的內建屬性
