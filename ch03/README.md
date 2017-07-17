# Chap. 03 使用Docker部署Node服務

## Docker基礎

設定Node的執行環境，有時候需要編譯Node的C++模組。Node的編譯環境要求GCC/g++ 4.8或以上的版本。在一些較低版本的Linux伺服器上，編譯安裝GCC是一件非常耗時的事情。使用Docker可以省去一些麻煩，快速部署應用。可使用docker pull指令下載一個支援Node執行和編譯的Linux映像檔，基於此映像檔製作一個包含Node程式執行環境的新映像檔，以後就可以直接使用這個映像檔部署Node服務。

Docker使用用戶端/伺服器(C/S)模型。其守護處理程序接收用戶端的指令，例如執行、傳送、發佈等。Docker用戶端和守護處理程序可執行在同一個系統內，也可以使用Docker用戶端去連接一個遠端的守護處理程序，此時用戶端和守護處理程序之間透過socket或RESTful API進行通訊。預設情況下，Docker守護處理程序會產生一個socket(*/var/run/docker.sock*)檔案來與本機的用戶端通訊，而不會監聽任何通訊埠。可以編譯檔案*/etc/default/docker*，然後重新啟動服務實現遠端通訊。

相比虛擬機器，Docker是一種輕量級的虛擬技術。Docker相對於裸機，其運算能力幾乎沒有損耗。它直接利用宿主機的系統核心，啟動一個Docker容器就像啟動一個處理程序一樣輕便。Image、Container和registery這些概念都可以對應到Git下。

下一節將使用一個已有的映像檔建置我們的執行環境。

## 在Docker中執行Node

以筆者一個Ubuntu 14.04為基礎的的映像檔製作了一個包含Node程式執行環境的新映像檔。

```sh
$ docker pull banz/ubuntu14.04-ansible-nodev4.4.7
```

```sh
$ docker images
REPOSITORY                            TAG                 IMAGE ID            CREATED             SIZE
banz/ubuntu14.04-ansible-nodev4.4.7   latest              cc27126cb860        12 months ago       633MB
```

此映像檔是基於Ubuntu14.04-ansible製作，增加了Node二進位程式和幾個常用全域模組。然後可執行映像檔：

```sh
docker run -ti -v /Users/eden90267/Desktop/node/node-advanced/data:/root -p 8079:3000 banz/ubuntu14.04-ansible-nodev4.4.7 /bin/bash
```

該指令建立了container，並且把宿主的/data目錄掛載到container的/root下。在容器中，可使用ping指令測試一下是否可聯網。如果ping不通，可能是由於系統本機轉發支援沒有開啟。容器中執行exit，執行`sysctl net.ipv4.ip_forward`檢視，如果是0，則需要手動開啟，可執行以下指令：

```sh
sysctl -w net.ipv4.ip_forward=1
```

上面的指令同時將宿主的8079通訊埠對應容器的3000通訊埠。只要容器內的服務監聽3000通訊埠，外部對宿主8079通訊埠請求便能存取到容器內部的服務。回到宿主的命令列下執行以下指令：

```sh
$ docker ps -a
CONTAINER ID        IMAGE                                 COMMAND             CREATED             STATUS              PORTS                    NAMES
3003a4f8ce9e        banz/ubuntu14.04-ansible-nodev4.4.7   "/bin/bash"         5 minutes ago       Up 5 minutes        0.0.0.0:8079->3000/tcp   dreamy_babbage
```

以後可使用

```sh
docker start -ai dreamy_babbage
```

來啟動這個container。dreamy_babbage是container name，隨機產生。

我們來對container執行以下指令：

```sh
node -v
node-gyp -v
pm2 -v
gulp -v
```

可看到對應的版本編號。以後我們可把專案原始程式放到宿主的/data目錄下，然後在container啟動後到/root下使用。在容器中，切換到/data目錄下，將其中的book目錄覆寫到~目錄下。然後執行cd ~/book，這個目錄下的node_modules裡包含了以後章節中需要的一些模組。本書之後的使用案例，建議在這個容器中執行。

## 匯出設定好的容器

上節講到可以把宿主的/data目錄掛載到container的/root下。原始程式可以使用Git倉庫託管，在宿主機器上直接拉取到/data，這樣進入容器後可以直接存取。進入容器，安裝好執行環境需要的程式與模組後，可以將容器儲存成一個檔案，以後需要在其他機器上部署的時候可以直接匯入。這種方式使得我們對Node程式的執行環境實現一次設定、多處部署。


要將容器匯出：

```sh
docker export <CONTAINER0ID> > ~/export.tar
```

之後可將該檔案複製到其他機器。

```sh
cat export.tar | docker import - dev/ubuntu:latest
```

將匯出的容器匯入為映像檔，然後執行這個映像檔即可。