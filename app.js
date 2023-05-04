// expressフレームワークを利用
const express = require('express');
const app = express();
const http = require('http').createServer(app);
// socket.ioライブラリを利用。イベント駆動のリアルタイムな通信を行える
const io = require('socket.io')(http);

// 3000番ポートで通信
const PORT = 3000;
// ブラウザからのリクエストにviews/index.htmlを返す
app.use(express.static('./views/'));
// クライアントがアクセスしたことを検知
io.on('connection', (socket) => {
  const id = socket.id;
  console.log(id);
  // 'playerSelect'イベントを受信し、playerHand(※変数名)を受け取る
  socket.on('playerSelect', (playerHand) => {
    console.log(playerHand); // 開発中
    // もう一人のクライアントに送信するために変数を宣言
    const enemyHand = playerHand;
    console.log(enemyHand); // 開発中
    // 'enemySelect'イベントを発火し、enemyHand(※変数名)をもう一人のクライアントに送信する
    // 「broadcast」をつけることで送信者('playerSelect'イベントを発火した本人)以外を指定できる
    socket.broadcast.emit('enemySelect', enemyHand);
  });
});

// 「localhost:3000」でブラウザからアクセスできるようにする
http.listen(PORT, () => {
  console.log(`PORT: ${PORT}`);
});