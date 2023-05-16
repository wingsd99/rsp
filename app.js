const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);

const PORT = 3000;

app.use(express.static('./public'));
// app.use(express.static('./views'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/top.html');
});

app.get('/index/:id', (req, res) => {
  const roomNumber = req.params.id;
  // if (userA.room === '') {
  //   userA.room = roomNumber;
  //   socket.join(roomNumber);
  //   socket.emit('yourRoom', roomNumber);
  // } else {
  //   userB.room = roomNumber;
  //   socket.join(roomNumber);
  //   socket.emit('yourRoom', roomNumber);
  // }
  res.sendFile(__dirname + '/views/index.html');
});

const userA = {
  id: '',
  hand: '',
  result: '',
  room: ''
};
const userB = {
  id: '',
  hand: '',
  result: '',
  room: ''
};

io.on('connection', (socket) => {
  const clientsCount = io.engine.clientsCount;
  console.log(clientsCount, socket.id);
  // console.log(socket.rooms);
  // if (req.params.id = 1) {
  //   socket.join('room1');
  // } else if (req.params.id = 2) {
  //   socket.join('room2');
  // } else if (req.params.id = 3) {
  //   socket.join('room3');
  // }
  
  socket.on('playerSelect', (playerHand) => {
    const createUserA = () => {
      userA.id = socket.id;
      userA.hand = playerHand;
      socket.join(userA.room);
      console.log(socket.rooms);
    };
    const createUserB = () => {
      userB.id = socket.id;
      userB.hand = playerHand;
      socket.join(userB.room);
      console.log(socket.rooms);
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
      userA.room = '';
      
      userB.id = '';
      userB.hand = '';
      userB.result = '';
      userB.room = '';
    };

    if (userA.id === '') {
      createUserA();
      console.log('userA was created');
    } else {
      createUserB();
      console.log('userB was created');
      judgeMatch();
      console.log("userA", userA);
      console.log("userB", userB);
      clearUser();
      console.log('finish');
    }
  });
});

server.listen(PORT, () => {
  console.log(`PORT: ${PORT}`);
});

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
    //   console.log('userA was created');
    // } else {
    //   createUserB();
    //   console.log('userB was created');
    //   judgeMatch();
    //   console.log('finish');
    // }