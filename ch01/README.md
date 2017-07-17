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

當呼叫http.request函數發起請求之後，Node會建立與伺服器的socket連接，而socket連接是需要IP位址和通訊埠號的，所以中間還有一個DNS解析過程。http.request函數傳回的物件req代表了這次HTTP請求，其監聽的response事件在連接建立之後，伺服器的HTTP標頭資訊解析完畢之後觸發。此物件的建置函數原始程式位於*_http_client.js*，以下截留出關鍵的程式碼片段：

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

這裡的重頭戲在createSocket()函數的呼叫上，這個函數實際上呼叫了net.js中定義的建置函數createConnection()，這個函數的定義如下所示：

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

self._handle是之前建立的TCP物件，在JavaScript層面呼叫connect()方法，會直接引起C++層面的TCPWrap::Connect方法的呼叫。到達這個函數之後，再繼續往下執行，則有關呼叫作業系統的API建立連接。這裡以Linux作業系統為例，Node使用Epoll處理非同步事件。下面簡要描述進入TCPWrap::Connect()函數之後的過程。大致分為四步：

1. 建立一個非阻塞的socket
2. 呼叫系統函數connect()
3. 呼叫`uv_epoll_ctl()`將建立的非阻塞socket與一個已存在的Epoll的控制碼連接起來
4. 呼叫`uv_epoll_wait()`函數，收集就緒的描述符號，然後執行對應的回呼函數

前兩步表現在tcp.c的uv_tcp_connect函數中。第三、四步稍微複雜些，呼叫完uv_tcp_connect()之後，其實並未連接Epoll控制碼。第三、四步的操作在後一個執行緒循環中進行。實際程式在*linux-core.cc*的`uv_io_poll()`函數中。

繼續，傳替connect()函數的第一個參數是TCPConnectWrap建置函數建立的req物件，此物件代表這次TCP連接階段。當連接過程結束，此物件的生命期也終結。這個物件的建置函數也是在C++檔案中定義的。這是因為這種物件未來要在C++層面存取，一些需要的特性必須在建置的時候設定，這就需要借助C++層面的建置函數實現。之後為這個req物件增加了oncomplete屬性，其值是一個名為afterConnect()的函數。傳給connect()方法的參數中沒有回呼函數，連接過程結束，JavaScript的程式是如何獲得通知？在上述的第四步中，回呼函數的呼叫堆疊最後會到達TCPWrap::AfterConnect()，這個函數中執行了下面的敘述：

```
req_wrap->MakeCallback(env->oncomplete_string(), arraysize(argv), argv);
```

env->oncomplete_string()代表的字串是oncomplete，這個呼叫實際上從C++層面呼叫了req物件的afterConnect()方法(此處req是建置函數TCPConnectWrap建立的物件)。因此afterConnect相當於回呼函數，該函數內部觸發connect事件。之前提到socket物件監聽了connect事件，因此一旦連接成功，此事件的回呼函數被呼叫。在該函數中，呼叫了`_flush`方法，用戶端開始向伺服器發送資料。至此為止，連接階段結束。

從對連接階段的分析得知，Node實現非同步流程的基本方式是**從JavaScript程式發起請求，借助V8的程式設計介面，進入C++程式，使用作業系統提供的非同步程式設計機制，例如Linux下的Epoll，向作業系統發起非同步呼叫，然後立即傳回。**主線的訊息循環會呼叫`uv_io_poll()`函數，此函數的主要工作就是不斷收集已經處於就緒狀態的描述符號，順序呼叫對應的回呼函數，執行回呼函數會從C++回到上層JavaScript層面，最後呼叫對應的JavaScript版本的回呼函數。這樣一圈下來，邏輯閉合。

#### 2. 請求與回應階段

前面比較詳細介紹了TCP的連接過程。Node讀寫socket也是非同步方式，流程與上述類似。上面討論提到afterConnect()方法會觸發connect事件。此事件代表連接過程完成，客戶可以向socket寫資料了。socket物件建立之後，同時還監聽了data事件，其回呼函數是socketOnData()，此方法在*_http.client.js*中定義。伺服器發送過來的任何資料，都會觸發這個函數執行。傳輸層不考慮資料格式，對資料格式的解析應該在取得資料之後開始。我們看到socketOnData中呼叫了HTTP協定解析器，邊接收資料邊解析，如下所示：

```js
function socketOnData(d) {
    var socket = this;
    var req = this._httpMessage;
    var parser = this.parser;
    var ret = parser.execute(d);
    // ...
```

parser是一個C++層面的建置函數建立的物件，相關原始程式在*node_http_parser.cc*中。解析的工作由C++的程式完成，parser物件的execute()方法對應於C++的Parser::Execut()函數。一旦伺服器的HTTP表頭解析完畢，會觸發parserOnIncomingClient函數的執行，此函數也定義在*_http.client.js*，這個函數會觸發response事件。以上程式在呼叫http.request()函數傳回後，監聽了此事件。在事件函數中，傳入的res物件又監聽了data和end事件，後續便可取得資料和獲得資料發送完畢的通知。

#### 3. 結束階段

如果HTTP請求標頭包含Connection:keep-alive(預設自動增加)，那麼當用戶端收到伺服器端的所有回應資料之後，與伺服器的socket連接仍然保持。此socket物件將快取在全域Agent物件的freeSockets中，下次請求相同的位址時，直接取用，節省DNS解析和連接伺服器的時間。

### 本機磁碟I/O——多執行緒模擬

在HTTP請求的實例中，我們看到Node的非同步呼叫，其背後的機制是Linux的Epoll。在Windows下，則是採用完成通訊埠(IOCP)。這兩種方式的共同點是沒有啟用任何其他的執行緒。首先，Node的C++程式在執行非同步請求時沒有建立執行緒，也沒有佔用執行緒池的資源；其次，使用Epoll或IOCP，沒有隱式地引起更多執行緒的建立，也不存在執行緒被阻塞等待I/O完成的情況，我們可以稱上述過程完全非同步。對於網路I/O是這樣，但對於本機的磁碟I/O，Node使用了不同的策略。與遠端呼叫相比，本機磁碟I/O具有不同的特點：

1. 本機磁碟讀寫比網路請求快得多
2. 磁碟檔案按塊存取，作業系統的快取機制使得順序讀寫檔案的效率極高
3. 相對於同步的讀寫，完全非同步的處理流程複雜得多

第三點，看之前TCP連接過程，應該會同意。但也許真正值得考慮的是第一和第二點。Node在非主執行緒中執行同步程式，用多執行緒的方式模擬出非同步的效果，以上述前兩點考慮，比起完全非同步為基礎的方案，
效率應該不會低多少。除本機磁碟操作，第一個範例提到的非同步解析DNS也是如此。

Linux下Node在啟動時，會維護一個執行緒池，Node使用這個執行緒池的執行緒，同步地讀寫檔案；而在Windows下，則利用IOCP的通知機制，把同步程式交給作業系統管理的執行緒池執行。

為什麼Windows下，主執行緒的非同步呼叫都使用了IOCP的通知機制？怎麼區分完全非同步和模擬出的非同步？因為讀寫本地檔案時，是以同步的方式呼叫ReadFile或WriteFile這種API，執行緒會等待，直到I/O過程結束，才會執行下面的敘述。雖然這個過程沒有使用Node本身的執行緒池，但一樣會消耗作業系統執行緒池的資源。而對於socket I/O，主執行緒呼叫完這種函數會立即傳回，不存在執行緒因為等待I/O而無法處理其他工作的情況。

## 事件驅動

對Node來講，以http請求為例，JavaScript程式中出現的connect、data、end、close等事件，驅動著程式的執行。從真實的程式設計角度看，所謂的事件就是向作業系統發起非同步呼叫之後，在以後某個時刻，所期待的結果發生了，這便是一個事件。

Node內建函數`uv_epoll_wait`收集所有就緒的事件，然後依次呼叫回呼函數。如果上層監聽了對應事件，則依次呼叫對應的事件函數。例如發起一個socket連接請求，當連接成功後，從C++進入到JavaScript層面後，會觸發connect事件，其事件函數被依次呼叫。因為JavaScript的閉包機制，呼叫之前的上下文依然保留，程式可以接著向下執行已經連接之後的邏輯。

在同步與非同步的比較，我們討論了非同步程式設計的諸多好處，主要表現在節省CPU資源，不阻塞，快速，高回應。但還有一點沒有談到，就是非同步的編碼範式幾乎用不到**鎖**，這在C++層面由起表現出它的優勢。我們驚奇地發現，不僅所有JavaScript程式均執行於主執行緒，對於完全非同步的情況，C++程式也不需要使用鎖。因為所有程式也執行在主執行緒，物件內部狀態都在一個執行緒中保護。