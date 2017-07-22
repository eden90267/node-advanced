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