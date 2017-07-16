# Chap01. Node非同步程式設計範式

## 同步與非同步的比較

Node是一個**JavaScript執行時期環境**，它為JavaScript提供了一個**非同步I/O**程式設計架構，較其他語言通常使用的同步式方案，其效能猶如「搭載上了火箭」。Node指導思想：CPU執行指令是非常快速的，但I/O操作相對而言是極其緩慢的。可以說，Node要解決的也是這種問題，即給CPU執行的演算法容易，I/O請求卻頻繁的情況。

請求到了，相對於傳統的處理程序或執行緒同步處理的方式，Node**只在主執行緒中處理請求**。如果遇到I/O操作，則以**非同步方式發起呼叫**，主執行緒立刻傳回，繼續處理之後的工作。由於非同步，一次客戶請求的處理方式由流式變為階段式。**我們使用Node撰寫的JavaScript程式都執行在主執行緒**。

假設一次客戶請求分為三階段——執行函數a，一次IO操作，執行函數b。如圖是代表了同步式的處理流程：

![](http://i.imgur.com/q4OWDDP.png)

可用一段虛擬碼描述同步請求的過程：

```js
function request() {
    // 開始執行函數a
    $rel_a = stage_a();
    // 讀取檔案，將檔案內容傳回到$data
    $data = reqdfile();
    // 將前兩步的結果作為參數，呼叫函數b
    stage_b($rel_a, $data);
}
```

同步式處理方式中，每個請求用一個執行緒(或處理程序)處理。一次請求處理完畢後，執行緒會被回收。如果有更多客戶請求，執行緒數還要增加。

相較Node非同步執行。Node一個主執行緒解決了所有的問題。非同步式處理流程中，每一個方塊代表了一個階段工作的執行。

![](http://i.imgur.com/GmaB7Xa.png)

非同步一樣可用一段虛擬碼表達：

```js
var request = function() {
    // 開始執行函數a
    var rel_a = stage_a();
    // 發起非同步讀取，主執行緒立即傳回，處理之後的工作
    readfileAsync(function(data) {
        // 在隨後的循環中，執行回呼函數
        stage_b(rel_a, data);
    });
}
```

Node也「站在巨人的肩上」。這個巨人是大名鼎鼎的V8引擎，有這樣的心臟，再配合以高階函數和閉包為基礎的非同步編碼範式，使得用Node建置的程式在效能上具有出色的表現。

>Tips：  
>高階函數與閉包是兩個連繫非常緊密的概念。如果一個函數以一個或多個函數作為參數，或傳回一個函數，那麼稱此函數為**高階函數**。Node中大部分的非同步函數，參數清單的**最後一項接受一個回呼**，這種非同步函數就符合高階函數的定義。高階函數執行後傳回的函數，或接受的函數參數，則被稱為**閉包**。閉包的最大特點是參考了它之外的變數，這些變數既不是全域，也不是參數和局部，而是作為閉包即時執行的上下文環境存在。如下所示：

```js
function wrapper(price) {
    var freeVal = price;
    function closure(delta) {
        return freeVal * delta;
    }
    return closure;
}

var clo1 = wrapper(100);
var clo2 = wrapper(200);
setTimeout(function() {
    console.log(clo1(1));
    console.log(clo2(1));
}, 500);
```

>結果：

```sh
100
200
```

>函數wrapper是一個高階函數，執行後傳回一個閉包，這個閉包將price納入自己的作用域，price就不再是函數內部的區域變數，它有一個名字叫自由變數，其生命期與閉包綁定。price這樣的自由變數被閉包內的程式參考，成為閉包執行的上下文。

Node高性能的來源，得益於它非同步的執行方式。不開啟執行緒或處理程序，把耗時的I/O請求委派給作業系統。例如辦理簽證，辦理視窗來了一個工作，就交給協力廠商去辦理，協力廠商就有一個接單佇列，其只需拿著所有的接單，去一一辦理即可。

然而非同步帶來傳回結果次序的不確定性，是非同步程式設計架構需要解決的問題。

假設有一個非同步讀取檔案函數readAsync，在主執行緒中，呼叫此函數發起了一個非同步讀取操作。因為執行的是非同步函數，所以主執行緒立刻傳回，繼續處理其他工作。作業系統執行完具體讀取操作後，將資料準備好，通知主執行緒。這個過程需要解決的問題是，當主執行緒獲得通知後，如何識別非同步請求是誰發起的，以及獲得資料之後下一步該做什麼。前面講到了閉包，這裡剛好就需要閉包的特性對接執行流程。因為閉包保留了非同步呼叫發起的上下文資訊，於是執行閉包，將結果傳入，就可沿著發起讀取檔案時的執行環境繼續執行後續邏輯。

設想如果來了1000個平行處理請求，按照建立處理程序或執行緒的同步處理方式，一個伺服器執行那麼多處理程序或執行緒，使CPU頻繁地在上下文切換是多麽低效。CPU和記憶體資源的內耗擠壓了真正花費在處理業務邏輯上的時間，造成伺服器效能下降。但假如伺服器少開執行緒，則又會造成請求排隊等待。而在非同步方式下，不需要開多餘的執行緒，所有請求均由主執行緒承擔。一旦遇到耗時的I/O請求，以非同步的方式發起呼叫。一次非同步呼叫同時也會建立一個閉包傳進去，作業系統執行實際的I/O操作，將結果放入指定快取，然後將本次I/O置為就緒狀態。主執行緒在每一次循環中，收集就緒的請求，取出原先的閉包，然後呼叫回呼函數並將結果傳入。這個過程不需要建立任何多餘的執行緒或處理程序。

Node能夠大幅利用硬體資源，即原因即如此。換句話說，CPU把絕大多數時間花在處理實際業務邏輯上，而非執行緒或處理程序的等待和上下文切換上。在這種處理模式下，假如主執行緒阻塞，那說明真的是沒有工作需要處理，而非等待I/O結束。

## Node 非同步的實現

### HTTP請求——完全非同步的實例

HTTP是一個應用層協定，在傳輸層使用TCP協定與伺服器進行資料互動。一次HTTP請求分成四個階段，分別是連接、請求、回應、結束。以下是一段發起HTTP請求的程式，看看Node是如何以非同步的方式完成上述四個過程：

```js
"use strict";

var http = require('http');
var options = {
    host: 'cnodejs.prg',
    post: 80,
    path: '/',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};
var req = http.request(options);
req.once('response', (res) => {
    var result = '';
    res.on('data', function (chunk) {
        result += chunk.toString();
    });
    res.on('end', function () {
        console.log(result);
    });
});
req.on('error', (e) => {
    console.error(e.message);
});
req.end();
```

>**Tips**：  
>ES6引入了大量的語法特性，小到能夠簡化程式的「語法糖」，例如「箭頭函數」和「解構設定值」；大到原生支援Promise物件和產生器「Generator」。其目標是使得JavaScript可以用來撰寫大型的、複雜的應用程式，成為企業級開發語言。

這裡為了簡單，將Buffer物件轉換成字串處理了。實際應用中，應該始終以Buffer物件操作資料。接下來先來看連接階段的執行。

#### 1. 連接階段

當呼叫http.request函數發起請求之後，Node會建立與伺服器的socket連接，而socket連接是需要IP位址和通訊埠號的，所以中間還有一個DNS解析過程。http.request函數傳回的物件req代表了這次HTTP請求，其監聽的reqsponse事件在連接建立之後，伺服器的HTTP標頭資訊解析完畢之後觸發。此物件的建置函數原始程式位於*_http_client.js*，以下截留出關鍵的程式碼片段：

```js
function ClientRequest(options, cb) {
    var self = this;
    OutgoingMessage.call(self);
    var agent = options.agent;
    var defaultAgent = options._defaultAgent || Agent.globalAgent;
    self.agent = defaultAgent;
    if (self.agent) {
        if (!self.agent.keepAlive && !Number.isFinite(self.agent.maxSockets)) {
            self._last = true;
            self.shouldKeepAlive = false;
        } else {
            self._last = false;
            self.shouldKeepAlive = true;
        }
        self.agent.addRequest(self, options);
    }
    self._deferToConnect(null, null, function () {
        self._flush();
        self = null;
    });
}
```

以上程式獲得了一個全域的Agent物件，**這個全域的物件維護一個socket連接池**。addRequest()方法先尋找是否有備用的連接，如果有，則直接取得一個與被連伺服器保持TCP連接的socket物件，否則呼叫createSocket()方法，建立一個新的socket物件。大致過程如下：

```js
Agent.prototype.addRequest = function (req, options) {
    var freeLen = this.freeSockets[name] ? this.freeSockets[name].length : 0;
    var sockLen = freeLen + this.sockets[name].length;
    if (sockLen < this.maxSockets) {
        var newSocket = this.createSocket(req, options);
        req.onSocket(newSocket);
    } else {
        debug('wait for socket');
        //We are over limit so we'll add it to the queue.
        if (!this.requests[name]) {
            this.requests[name] = [];
        }
        this.requests[name].push(req);
    }
};
```

我們看到，createSocket()方法傳回一個新建立的socket物件newSocket，然後以這個物件為參數，立即呼叫req物件的onSocket()方法。req就是建置函數ClientRequest()正在建置的物件，onSocket()方法只有一行程式。

```js
process.nextTick(onSocketNT, this, socket);
```

這表示在下一輪循環才執行onSocketNT()函數，這個函數執行會觸發socket事件。因為在呼叫_deferToConnect()函數的過程中，req監聽了此事件，而監聽這個事件的意義在於，在執行此事件的回呼函數時，讓newSocket物件監聽connect事件。

這裡的重頭戲在createSocket()函數的呼叫上，這個函數實際上呼叫了net.js中定義的建置函數createCpnnection()，這個函數的定義如下所示：

```js
exports.connect = exports.createConnection = function () {
    const argsLen = arguments.length;
    var args = new Array(argsLen);
    for (var i = 0; i < argsLen; i++)
        args[i] = arguments[i];
    args = normalizeConnectArgs(args);
    var s = new Socket(args[0]);
    return Socket.prototype.connect.apply(s, args);
};
```

程式的倒數第二行建立了newSocket物件，此物件代表此次HTTP請求的socket連接，紀錄著連接的各種狀態資訊，例如是否寫入、讀取、並負責監聽與socket狀態相關的事件。最後一行明確以這個物件為上下文，呼叫connect()方法。這個方法大致流程如下：

```js
Socket.prototype.connect = function (options, cb) {
    if (!this._handle) {
        this._handle = pipe ? createPipe() : createTCP();
        initSocketHandle(this);
    }
    var dns = require('dns');
    dns.lookup(host, dnsopts, function (err, ip, addressType) {
        if (err) {} else {
            self._unrefTimer();
            connect(self,
                ip,
                port,
                addressType,
                localAddress,
                localPort);
        }
    });
    return self;
};
```

上面只寫出主要的執行流程，關鍵的步驟是呼叫createTCP()函數，建置了一個TCP物件，然後呼叫dns模組的lookup()方法進行DNS解析。createTCP()函數定義如下：

```js
function createTCP() {
    var TCP = process.binding('tcp_wrap').TCP;
    return new TCP();
}
```

可見，TCP物件的建置函數是在`tcp_wrap`模組中定義的，對應於函數TCPWrap::New()，原始程式位於*tcp_wrap.cc*中。這個由C++為JavaScript撰寫的建置函數附帶了諸多的原型方法，JavaScript層面的物件能夠直接呼叫這些原型函數。因此，藉由這些C++版本的方法，JavaScript擁有了非同步讀寫操作系統層面socket描述符號的能力。這些原型函數大致分為兩種，一種維護socket描述符號狀態，例如connect、listen、bind等。還有一種是讀寫socket，包含writev、readStart等。建立了TCP物件之後，接下來呼叫dns模組的lookup()方法，執行此函數會立即傳回。於是本輪呼叫堆疊依次退出，req物件的建置過程結束。

http.request呼叫傳回之後，緊接著呼叫req的end()方法。呼叫此方法表示用戶端要發送的資料已經全部寫完。事實上，資料僅是被快取，因為連接還沒建立。實例中請求類型是GET，因此這裡的資料僅是HTTP的請求標頭資訊。隨後我們將看到，用戶端真正向伺服器發送資料的時機是在socket連接完畢執行回呼函數的時候。

在DNS解析完畢之後，邏輯繼續往下走，呼叫了net.js內部的connect()函數。此時一切就緒，開始用通訊埠編號和解析獲得的IP位址發起socket連接請求。

```js
function connect(self, address, port, addressType, localAddress, localPort) {
    //...
    const req = new TCPConnectWrap();
    req.oncomplete = afterConnect;
    req.address = address;
    req.port = port;
    req.localAddress = localAddress;
    req.localPort = localPort;
    if (addressType === 4)
        err = self._handle.connect(req, address, port);
}
```

self._handle是之前建立的TCP物件，在JavaScript層面呼叫connect()方法，會直接引起C++層面的TCPWrap::Connect方法的呼叫。到達這個函數之後，再繼續往下執行，則有關呼叫作業系統的API建立連接。