const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);

const PORT = 3000;

app.use(express.static('./views/'));

// できればグローバル変数は使いたくない
// イベントからuser変数を脱出させる方法を模索中
// これからroom機能を作るならさらに問題になる
// userA.roomで部屋を分ける方法もある
const userA = {
  id: '',
  hand: '',
  result: ''
}
const userB = {
  id: '',
  hand: '',
  result: ''
}

io.on('connection', (socket) => {
  console.log(socket.id);
  const clientsCount = io.engine.clientsCount;
  console.log(clientsCount);
  socket.on('playerSelect', (playerHand) => {
    const createUserA = () => {
      userA.id = socket.id;
      userA.hand = playerHand;
    };
    const createUserB = () => {
      userB.id = socket.id;
      userB.hand = playerHand;
    };

    const win = () => {
      userA.result = 'WIN';
      userB.result = 'LOSE';
    };
    const draw = () => {
      userA.result = 'DRAW';
      userB.result = 'DRAW';
    };
    const lose = () => {
      userA.result = 'LOSE';
      userB.result = 'WIN';
    };

    const judgeMatch = () => {
      if (userA.hand === 'Rock') {
        if (userB.hand === 'Rock') draw();
        if (userB.hand === 'Scissors') win();
        if (userB.hand === 'Paper') lose();
      }
      if (userA.hand === 'Scissors') {
        if (userB.hand === 'Rock') lose();
        if (userB.hand === 'Scissors') draw();
        if (userB.hand === 'Paper') win();
      }
      if (userA.hand === 'Paper') {
        if (userB.hand === 'Rock') win();
        if (userB.hand === 'Scissors') lose();
        if (userB.hand === 'Paper') draw();
      }
      io.to(userA.id).emit('matchResult', [userA.result, userB.hand]);
      io.to(userB.id).emit('matchResult', [userB.result, userA.hand]);
    };

    const clearUser = () => {
      userA.id = '';
      userA.hand = '';
      userA.result = '';

      userB.id = '';
      userB.hand = '';
      userB.result = '';
    }
    
    if (userA.id === '') {
      createUserA();
      console.log(userA);
      console.log('userA is created');
      io.to(userB.id).emit('enemySelect');
    } else {
      createUserB();
      console.log(userB);
      console.log('userB is created');
      judgeMatch();
      clearUser();
      console.log('finish');
    }
    // class UserInfo {
    //   constructor(id, hand, result) {
    //     this.id = id;
    //     this.hand = hand;
    //     this.result = result;
    //   }
    //   get getUser() {
    //     return this.id;
    //   }
    //   get getHand() {
    //     return this.hand;
    //   }
    //   get getResult() {
    //     return this.result;
    //   }
    //   set setResult(result) {
    //     this.result = result;
    //   }
    // };
    // const createUserA = () => {
    //   const userA = new UserInfo(socket.id, playerHand);
    //   return userA;
    // };
    // const createUserB = () => {
    //   const userB = new UserInfo(socket.id, playerHand);
    //   return userB;
    // };
    // const judgeMatch = () => {
    //   userA.setResult = 'win';
    //   userB.setResult = 'lose';
    //   io.emit('matchResult', result);
    // };
    // if (typeof userA === 'undefined') {
    //   createUserA();
    //   console.log('userA is created');
    // } else {
    //   createUserB();
    //   console.log('userB is created');
    //   judgeMatch();
    //   console.log('finish');
    // }
  });
});

server.listen(PORT, () => {
  console.log(`PORT: ${PORT}`);
});