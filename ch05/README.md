# Chap05. V8引擎

V8引擎是Node的心臟，它為Node撰寫可擴充的高性能伺服器提供了基本動力。本章探討它的特性以及這些特性對程式的影響做一個深入探討。了解這些，有助於避開錯誤，提升程式執行效率。

## JavaScript程式的編譯與最佳化

Node可以看作是JavaScript的執行時期環境。一方面，它提供了多種可呼叫的API，如讀寫檔案、網路請求、系統資訊等。另一方面，因為CPU執行的是機器碼，它還負責將JavaScript程式解釋成機器指令序列執行，這部分工作是由V8引擎完成。V8引擎是Node的心臟，其誕生之初的目標，就是**加強指令稿的執行效率**，它甚至直接將程式編譯為本機機器碼，以節省一般指令碼語言解釋執行的時間。

### 即時編譯

V8採用即時編譯技術(JIT)，直接將JavaScript程式編譯成本地平台的機器碼。巨觀上看，其步驟為JavaScript原始程式->抽象語法樹->本機機器碼，並且後一個步驟只依賴前一個步驟。這與其他解譯器不同，例如Java語言須先將原始程式編譯成位元組碼，然後給JVM解釋執行，JVM根據最佳化策略，執行過程中有選擇地將一部分位元組碼編譯成本地機器碼。V8不產生中間程式，過程如下：

JavaScript source code -> 抽象語法樹 -> 機器指令

V8設計之初，是加快Chrome瀏覽器執行網頁尾本的效率，當網頁載入完成，V8一步合格，編譯成機器碼，CPU就開始執行了。比起產生中間碼解釋執行的方式，V8的策略省去一個步驟，程式會更早地開始執行。並且執行編譯好的機器指令，也比解釋執行中間碼的速度更快。不足的事，**缺少位元碼這個中間表示**，**使得程式最佳化變得更困難**。

### 隱藏類別

類別是被熟知的概念，這裡加上「隱藏」兩字修飾，我們可以先考慮，什麼是不隱藏的類別。那應該是C++/Java這種靜態類型語言中，開發者定義的類別。這些靜態類型語言的每一個變數，都有一個唯一確定的類型。因為有類型資訊，一個物件包含哪些成員和這些成員在物件中的偏移量等資訊，編譯階段就可確定，即時執行CPU只需要用物件起始位址——C++中是this指標，加上成員在物件內部的偏移量即可存取內部成員。這些存取指令在編譯階段就產生了。

但對於JavaScript這種動態語言，變數在執行時期可以隨時由不同類型的物件設定值，並且物件本身可以隨時增刪成員。**存取物件屬性需要的資訊完全由執行時期決定**。為了實現按照索引的方式存取成員，V8「悄悄地」給執行中的物件分了類別，在這個過程中產生了一種**V8內部的資料結構**，即**隱藏類別**。**隱藏類別本身是一個物件**。

當定義一個建置函數，使用這個函數產生第一個物件的時候，V8會為它初始化一個隱藏類別。以後使用這個建置函數產生的物件指在同一個隱藏類別。但假如程式中對某個物件增加或刪除某些屬性，V8立即建立一個新的隱藏類別，改變之後的物件指向新建立的隱藏類別。

可見，隱藏類別造成給物件分組的作用。同一組的物件，具有相同的成員名稱。隱藏類別紀錄了成員名稱和偏移量，根據這些資訊，V8能夠按照物件起始位址＋偏移量存取成員變數。在程式中，存取物件成員是非常頻繁的操作，相比於把屬性名稱作為鍵值，使用字典尋找的方式存取成員，使用索引的方式對效能的改進更明顯。

### 內聯快取

借助隱藏類別，可以使用陣列索引的方式存取物件成員。但成員的索引值是以雜湊表的方式儲存在隱藏類別中。如果每次存取屬性都搜尋隱藏類別的雜湊表，那麼這個使用偏移量的方式不會帶來任何好處。內聯快取是以程式執行為基礎的局部性原理，動態產生使用索引尋找的程式。下一次存取成員就不必再去搜尋雜湊表。可以用兩段虛擬程式碼描述這個過程：

```c++
Object* find_name_general(Person* p) {
    Class* hidden_class = p->get_class();
    int offset = hidden_class->lookup_offset("name");
    update_cache(hidden_class, offset);
    return p->properties[offset];
}
Object* find_name_fast(Person* p) {
    if (Cached == p->get_class()) {
        // 內聯程式，直接使用快取結果
        return p->properties[CACHE_OFFSET];
    }else{
        return p->get_class()->lookup_offset("name");
    }
}
```

### 最佳化回復

V8為了進一步提升JavaScript程式的執行效率，使用了Crankshaft編譯器產生更高效的機器碼。程式在執行時期，V8會擷取JavaScript程式執行資料。當V8發現某函數執行頻繁，就將其標記為熱點函數。針對熱點函數，V8的策略較為樂觀，偏好認為此函數比較穩定，類型已經確定，於是呼叫Crankshaft編譯器，產生更高效的機器碼。後面的執行中，萬一遇到類型變化，V8採取將JavaScript函數回復到最佳化前的較一般的狀況。

```js
function add(a, b) {
  return a + b;
}
for (var i = 0; i < 10000; ++i) {
    add(i, i);
}
add('a', 'b');
```

上述程式在執行for循環的過程中，每次呼叫add()函數，傳入的參數是整數，執行一定次數後，V8可能把這個函數標記為熱點函數，並根據每次執行傳入的參數預測，此函數的參數a,
b為整數。於是呼叫Crankshaft編譯器產生對應的程式。但當循環退出，執行字串相加時，V8只好將函數回復到一般狀態。回復過程就是根據函數原始程式，產生對應的語法樹，然後編譯成一般形式的機器碼。可以預見這個過程是比較耗時的，並且放棄了最佳化後的程式去執行一般形式的程式，因此要盡量避免觸發。

### 寫出更具親和性的程式

以上討論V8的一些特性。根據這些知識，在程式中，應該盡量避免一些錯誤，使得程式在V8環境中執行效能表現得更好。

```js
// 片段一
var person = {
    add: function(a, b) {
      return a + b;
    }
};
person.name = 'li';
// 片段二
var person = {
    add: function(a, b) {
      return a + b;
    },
    name: 'li',
};
```

使用片段二的方式效率更高。片段一會造成隱藏類別的衍生。替物件動態地增加和刪除屬性都會衍生新的隱藏類別。假如物件的add函數已經被最佳化，產生了更高效的程式，則因為增加或刪除屬性，這個改變後的物件無法使用最佳化後的程式。

最佳化回復的實例也啟示我們，函數內部的參數類型越確定，V8越能夠產生最佳化後的程式。我們也要避免最佳化回復，例如可以再撰寫一個專門針對字串相加的函數，而非一個函數同時處理整數和字串。

### 借助TypeScript

JavaScript的動態、弱型別語言，擁有極大的靈活性。但這種靈活性很有可能要付出一些代價，為避免效能的損失，不妨對自己提出更高的要求。方法之一就是可以透過更嚴格的編碼標準，最好能從語法上強制程式符合某種契約，只有符合這種語法規則的檔案才能正常使用，來實現語言等級的最佳化。這樣做不僅能加強V8執行的效率，也使專案在變大的時候仍具備良好的可維護性。

TypeScript是微軟推出的JavaScript超集合。TypeScript完全相容JavaScript語法。因此使用它沒有任何門檻。但它增加了一些增強的語法，例如可定義強類型。類型不符合就無法編譯成功。TypeScript的ts檔執行前，需編譯成一般的JavaScript檔案，而編譯使得任何的語法錯誤可以被提前發現。例如可以定義一個相加函數，只接受數值型的參數。

```ts
"use strict";

function sum(x:number, y:number):number {
    return x + y;
}

console.log(sum(5, 8));
console.log(sum('1', 2)); // 無法編譯成功- 'string' is not assignable to parameter of type 'number'
```

可使用TypeScript介面的語法，使這種動態增加無法編譯成功：

```ts
"use strict";
interface SquareConfig {
    color: string,
    width: number,
}
// ok
let Square: SquareConfig = {color: 'black', width: 20};

// 編譯顯示出錯
let Square1: SquareConfig = {color: 'black', width: 20, height: 20};

// 編譯顯示出錯
Square.height = 20;
```

關於TypeScript更多內容：[https://tslang.cn/docs/home.html](https://tslang.cn/docs/home.html)

編譯ts檔案，需要先安裝對應的編譯器，在專案的根目錄下，執行：

```sh
yarn add typescript gulp gulp-typescript -D
```

_gulpfile.js_：

```js
var gulp = require("gulp");
var ts = require('gulp-typescript');

gulp.task('ts', function () {
    return gulp.src('./ts/**/*.ts')
        .pipe(ts({
            noImplicitAny: true,
            target: 'ES6'
        }))
        .pipe(gulp.dest('./'));
});
gulp.task('default', ['ts']);
```

然後執行`gulp`，就可以將ts資料夾內的ts檔案編譯為普通的JavaScript檔案。

## 垃圾回收與記憶體控制

### V8的垃圾回收演算法

JavaScript的物件在V8引擎的堆中建立，V8會自動回收不被參考的物件。採用這種方式，降低了記憶體管理的負擔，但也造成了一些不便，例如V8堆積記憶體大小的限制。在32位元系統上限制為0.7GB，64位元為1.4GB。之所以存在這種限制，根源在於垃圾回收演算法的限制。V8在執行垃圾回收的時候會阻塞JavaScript程式的執行，堆積記憶體過大導致回收演算法執行時間過長。「魚和熊掌不可兼得」，有垃圾回收的地方，都會存在堆大小的限制，Java也存在堆溢位的錯誤。

從巨觀上來看，V8的堆分為3部分，分別是**年輕分代**、**年老分代**、**大物件空間**。這三者儲存不同種類的物件。

#### 1. 年輕分代

年輕分代的堆積空間一分為二，只有一半處於使用中，另外一半用於垃圾清理。年輕分代主要儲存於那些生命期短暫的物件，例如函數中的區域變數。它們類似C++中在堆疊上分配的物件，當函數傳回，呼叫堆疊中的區域變數都會被解構掉。V8瞭解記憶體的使用情況，當發現記憶體空間不夠，需要清理時，才進行回收。實際步驟是，將還被參考的物件複製到另一半的區域，然後釋放目前一半的空間，把目前被釋放的空間留作備用，兩者角色互換。年輕分代類似執行緒的堆疊空間，本身不會太大，佔用它空間的物件類似C++中的局部物件，生命週期非常短，因此大部分都是需要被清理掉的，需要複製的物件極少，雖然犧牲了部分記憶體，但速度極快。

在C++程式中，當呼叫一個函數時，函數內部定義的局部物件會佔用堆疊空間，但函數巢狀結構總是有限的，隨著函數呼叫的結束，堆疊空間也被釋放掉。因此其執行過程中，堆疊猶如一個可伸長縮短的單眼鏡頭。而JavaScript程式的執行，因為物件使用的空間是在年輕分代中分配，當要在堆中分配而記憶體不夠時，由於新物件的擠壓，將超出生命期的垃圾物件清除出去，這個過程猶如在玩一種消除類遊戲。

#### 2. 年老分代

年老分代中的物件類似C++中使用new運算符號在堆中分配的物件。因為這種物件一般不會因為函數的退出而銷毀，因此生命期較長。年老分代的大小遠大於年輕分代。主要包含以下資料。

1. 從年輕分代中移動過來的物件。
2. JIT之後產生的程式
3. 全域物件

年老分代可用的空間要大許多，64位元為1.4GB、32位元為700MB。如果採用年輕分代一樣的清理演算法，浪費一般空間不說，複製大區塊物件在時間上也讓人難以忍受，因此必須採用新的方式。V8採用了**標記清除**和**標記整理**的演算法。其想法是將垃圾回收分為兩個過程，標記清除階段檢查堆中的所有物件，把有效的物件標記出來，之後清除垃圾物件。因為年老分代中需要回收的物件比例極小，所以效率教高。當執行完一次標記清除後，堆積記憶體變得不連續，記憶體碎片的存在使得不能有效使用記憶體。在後續的執行中，當遇到沒有一塊碎片記憶體能夠滿足申請物件需要的記憶體空間時，將觸發V8執行標記整理演算法。標記整理移動物件，緊縮V8的堆積空間，將碎片的記憶體整理為大區塊記憶體。實際上，V8執行這些演算法的時候，並不是一次性做完，而是走走停停，因為垃圾回收會阻塞JavaScript程式的執行，所以採取交替執行的方式，有效地減少了垃圾回收給程式造成的最大停頓時間。

#### 3. 大物件空間

大物件空間主要儲存需要較大記憶體的物件，也包含資料和JIT產生的程式。垃圾回收不會移動大物件，這部分記憶體使用的特點是，整塊分配，一次性整塊回收。

### 使用Buffer

Buffer使用堆外記憶體，當我們操作檔案，或發起網路請求，應該直接使用Buffer操作資料，而非將其轉成字串，這樣可以顯著提高效率。Buffer在堆外申請的空間釋放的時機是在Buffer物件被垃圾回收之時。我們不能決定V8什麼時候進行垃圾回收，因此在高平行處理使用Buffer的情景中，有可能造成Buffer維護的堆外記憶體遲遲無法釋放。這時可以考慮引用協力廠商模組，使得我們可以手動釋放Buffer的空間。

Node目前使用的Buffer是以V8為基礎的Uint8Array類別，這個類別提供了將堆外記憶體的控制權交出的函數。可以很容易地實現手動釋放記憶體的需求。

```c++
#include <stdlib.h>
#include <Node.h>
#include <v8.h>
#include <node_buffer.h>
using v8::ArrayBuffer;
using v8::HandleScope;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::Value;
using v8::Uint8Array;
inline bool HasInstance(Local<Object> obj) {
  return obj->IsUint8Array();
}
void Method (const v8::FunctionCallbackInfo<v8::Value>& args) {
  Isolate* isolate = args.GetIsolate();
  HandleScope scope(isolate);
  Local<Object> buf = args[0].As<Object>();
  if (!HasInstance(buf))
    return;
  Local<Uint8Array> array = buf.As<Uint8Array>();
  if (array->Buffer()->GetContents().ByteLength() <= 8 * 1024 || array->Buffer()->IsExternal())
    return;
  int64_t change_in_bytes = -static_cast<int64_t>(array->Buffer()->GetContents().ByteLength());
  ArrayBuffer::Contents array_c = array->Buffer()->Externalize();
  free(array_c.Data());
  isolate->AdjustAmountOfExternalAllocatedMemory(change_in_bytes);
}
void init(v8::Local<v8::Object> exports, v8::Local<v8::Object> module) {
  NODE_SET_METHOD(module, "exports", Method);
}
NODE_MODULE(binding, init);
```

上述程式直接匯出一個函數，這個函數接收一個Buffer物件。對於小於8KB的Buffer，它的記憶體可能來自Uint8Array的片段，因此不能簡單釋放。如果這個物件維護的推外記憶體大於8KB，就可以將記憶體釋放掉。而這行程式：

```c++
isolate->AdjustAmountOfExternalAllocatedMemory(change_in_bytes);
```

用來告知V8堆外記憶體已經改變了。傳入的change_in_bytes為負數，代表堆外記憶體減少了對應值。這個函數內部判斷了一下堆外記憶體是否超過一個固定值：

```c++
// I::kExternalAllocationLimit is const as (192 * 1024 * 1024)
if (change_in_bytes > 0 &&
    amount - *amount_of_external_allocated_memory_at_last_global_gc > I::kExternalAllocationLimit) {
  ReportExternalAllocationLimitReached();
}
```

可見，如果change_in_bytes為正，且堆外記憶體超過了這個固定值，就會呼叫V8內部的函數`ReportExternalAllocationLimitReached`。

前面提到V8對堆積記憶體的垃圾回收演算法採取增量標記的方式進行，這個函數的作用正是為增量標記演算法的執行提供時機。也就是V8只需要標記相隔兩次呼叫之間的新增物件。這便將每次需要呼叫標記處理的物件個數減少了。

### 避免記憶體洩漏

假設程式中需要一個佇列，以生產者消費者的方式處理元素，我們可能會撰寫一個類似以下的佇列類別：

```js
"use strict"
const MAXLEN = 2000;
class Queue {
    constructor() {
        this.filelist = [];
        this.top = 0;
    }
    Push(path) {
        this.filelist.push(path);
    }
    Pop() {
        if (this.top < this.filelist.length){
            if (this.top > 32) {
                this.filelist = this.filelist.splice(this.top, this.filelist.length - this.top);
                this.top = 0;
            }
            this.top += 1;
            return this.filelist[this.top - 1];
        } else {
            return null;
        }
    }
}
```

假如上述程式呼叫Pop()的頻率更高，那不會出現什麼問題，但如果Push()的操作頻率高於Pop()，那麼佇列就會不斷膨脹。因此，上述佇列是不安全的。我們可以替類別增加一個成員變數：

```js
"use strict"
const MAXLEN = 2000;
class Queue {
    constructor() {
        this.filelist = [];
        this.top = 0;
    }
    Push(path) {
        this.filelist.push(path);
    }
    Pop() {
        if (this.top < this.filelist.length){
            if (this.top > 32) {
                this.filelist = this.filelist.splice(this.top, this.filelist.length - this.top);
                this.top = 0;
            }
            this.top += 1;
            return this.filelist[this.top - 1];
        } else {
            return null;
        }
    }
    Shuff() {
        if ((this.filelist.length - this.top) > MAXLEN) {
            this.filelist = this.filelist.splice(this.top, MAXLEN - 700);
            this.top = 0;
        }
    }
}
```

我們可以在呼叫Pop()方法之後，呼叫一次Shuff()方法。如果發現佇列超過一定大小，將一部分資料刪除。除此之外，應該考慮借助Redis或Kafka實現生產者消費者佇列。

>**Tips**：  
>Redis和Kafka的區別如下。
>
>Redis是一個以**記憶體為基礎**的Key-Value儲存系統。Redis提供了豐富的資料結構，包含lists、sets、ordered sets、hashes以及對這些資料結構操作的API。ioredis是一個知名的Redis用戶端，它的特點如下。
>
>支援Cluster(叢集模式)、Sentinel(檢查點)、Pipelining、Lua指令搞和二進位訊息的發布訂閱；

>- 非常好用的API，支援Promise和ES6 Generator
>- 可以與C模組 Hiredis 一同使用
>- 支援對參數和傳回值自訂形式轉換函數
>- 允許使用者自訂指令
>- 支援二進位資料
>- 提供交易支援
>- 對key透明地增加字首，方便管理鍵的命名空間
>- 自動重連機制
>- 支援TLS、離線佇列，ES6標準的類型如Set和Map

下面是利用Redis作佇列的實例：

```js
var Redis = require('ioredis');
var redis = new Redis({
    port: 6379,
    host: '127.0.0.1'
});
const QUEUENAME = 'data_mq';
redis.rpush(QUEUENAME, 'Electric cars will be popular');
redis.lpop(QUEUENAME, function(err, data) {
  console.log(data);
})
```

ioredis支援叢集模式，使用起來和單機模式沒有太大區別，以下是一個連接叢集的實例。

```js
var Redis = require('ioredis');
// cluster mode
var redis_cluster = new Redis.Cluster([{
    port: port1,
    host: 'ip1'
}, {
    port: port2,
    host: 'ip2'
}], {
    redisOptions: {
        dropBufferSupport: true,
        parser: 'hiredis'
    }
});
redis_cluster.multi().set('foo', 'xbar').get('foo').exec(function(err, results) {
  console.log(results);
});
```

這裡連接了一個Redis叢集，並指定使用Hiredis(須先安裝這個模組)。Hiredis是一個用C語言實現的Redis協定解析器，對於像get或set這種簡單的操作，使用ioredis附帶的JavaScript版的解析器就足夠了。但對於lrange或ZRANGE這種可能傳回巨量資料的操作，使用Hiredis效果顯著

ioredis為每一個指令提供了一個二進位版本，用以操作二進位資料。例如lpop的二進位版本是lpopBuffer，它傳回Buffer類型的物件。

```js
redis.lpopBuffer(QUEUENAME, function(err, data) {
  console.log(data instanceof Buffer);
});
```

`console.log`將列印出true。

dropBufferSupport選項設置為true，表示ioredis將強制解析器傳回字串而非Buffer物件。這個選項預設為false，在使用Hiredis時，應該為true，以避免不必要的記憶體複製，否則會影響GC的效能。如果要使用二進位版本的指令，可以再建立一個使用預設協定解析氣的連接實例。

上述範例以交易的方式呼叫set和get。在叢集模式下，交易內部的操作只能夠在相同的key上進行。

關於ioredis的更多說明和使用實例：[https://github.com/luin/ioredis](https://github.com/luin/ioredis)。

Kafka是一個以**磁碟儲存為基礎**的、分散式發布訂閱訊息系統，可支援每秒數百萬等級的訊息。它的特點是每次向磁碟檔案尾端追加內容，不支援隨機讀寫，以O(1)的磁碟讀寫提供訊息持久化。Kafka還可用來集中收集紀錄檔，Node程式以非同步方式將記錄檔發送到Kafka叢集中，而非儲存到本機或資料庫。這樣consumer端可以方便地使用hadoop技術堆疊進行資料採擷和演算法分析。kafka-node是一個Node用戶端，它的安裝和使用，可參考：[https://github.com/SOHU-Co/kafka-node](https://github.com/SOHU-Co/kafka-node)。

JavaScript的閉包機制使得被非同步呼叫打斷的邏輯，在等待非同步完成的過程中，上下文環境仍能夠保留。非同步呼叫完成後，回呼函數可以在它需要的上下文環境中繼續執行。閉包的這個特點，使得它可以參考它之外的自由變數。一個函數執行完畢，其內部變數應該可以被回收。但閉包的參考，使這個問題變得稍微複雜一些。如果被閉包參考，而這個閉包又在有效期內，則這些變數不會被回收。例如：

```js
function CreatePerson(name) {
    var o = {
        sayName: function() {
          console.log(_name);
        }
    }
    var _name = name;
    return o;
}
var friend = CreatePerson('li');
friend.sayName();
```

我們透過建置函數建立的friend物件是一個閉包，這個閉包參考了建置函數中的_name變數，這個變數不會被釋放，除非將friend設定值為null。而下面的實例。

```js
var clo = function() {
  var largeArr = new Array(1000);
  return function() {
    console.log('run once');
    return largeArr;
  }
}();
setTimeout(clo, 2000);
clo = null;
```

執行等待2秒之後，列印出run
once。雖然立即將clo設定值為null，但是物件不會被釋放。setTimeout相當於發起一次非同步請求，這個非同步請求2秒之後結束，回呼正是col原來參考的閉包。

Node執行過程中，只要滿則以下三項中的任意一項，物件均不會被回收：

1. 全域變數或由全域變數出發，可以存取到的物件
2. 正執行函數中的局部物件，包含這些局部物件可以存取到的物件
3. 一個非全域物件，如果被一個閉包參考，則這個物件將和參考的閉包一同存在，即使離開了建立它的環境。這個物件稱為自由變數，它為未來閉包執行的時候保留上下文環境。