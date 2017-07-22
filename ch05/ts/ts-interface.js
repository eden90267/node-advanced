"use strict";
// ok
var Square = { color: 'black', width: 20 };
// 編譯顯示出錯
var Square1 = { color: 'black', width: 20, height: 20 };
// 編譯顯示出錯
Square.height = 20;
