"use strict";
// ok
let Square = { color: 'black', width: 20 };
// 編譯顯示出錯
let Square1 = { color: 'black', width: 20, height: 20 };
// 編譯顯示出錯
Square.height = 20;
