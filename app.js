const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);

const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('./public'));
// app.use(express.static('./views'));

app.get('/', (req, res) => {
  res.render(__dirname + '/views/top.ejs');
});

app.get('/index/:id', (req, res) => {
  const roomNumber = req.params.id;
  // roomNumberを渡すためにejsを導入
  res.render(__dirname + '/views/index.ejs', {roomNumber: roomNumber});
});

// 配列で作っておいた方が楽
// room1のuserAのidを指定するなら
// rooms[0].userA.id
const rooms = [
  // room1
  {
    userA: {
      id: '',
      hand: '',
      result: '',
      room: ''
    },
    userB: {
      id: '',
      hand: '',
      result: '',
      room: ''
    }
  },
  // room2
  {
    userA: {
      id: '',
      hand: '',
      result: '',
      room: ''
    },
    userB: {
      id: '',
      hand: '',
      result: '',
      room: ''
    }
  },
  // room3
  {
    userA: {
      id: '',
      hand: '',
      result: '',
      room: ''
    },
    userB: {
      id: '',
      hand: '',
      result: '',
      room: ''
    }
  }
];

io.on('connection', (socket) => {
  const clientsCount = io.engine.clientsCount;
  console.log(clientsCount, socket.id);
  
  socket.on('playerSelect', (playerInfo) => {
    const roomX = playerInfo[1] - 1;
    const createUserA = () => {
      rooms[roomX].userA.id = socket.id;
      rooms[roomX].userA.hand = playerInfo[0];
      rooms[roomX].userA.room = playerInfo[1];
    };
    const createUserB = () => {
      rooms[roomX].userB.id = socket.id;
      rooms[roomX].userB.hand = playerInfo[0];
      rooms[roomX].userB.room = playerInfo[1];
    };

    const win = () => {
      rooms[roomX].userA.result = 'WIN';
      rooms[roomX].userB.result = 'LOSE';
    };
    const draw = () => {
      rooms[roomX].userA.result = 'DRAW';
      rooms[roomX].userB.result = 'DRAW';
    };
    const lose = () => {
      rooms[roomX].userA.result = 'LOSE';
      rooms[roomX].userB.result = 'WIN';
    };

    const judgeMatch = () => {
      if (rooms[roomX].userA.hand === 'Rock') {
        if (rooms[roomX].userB.hand === 'Rock') draw();
        if (rooms[roomX].userB.hand === 'Scissors') win();
        if (rooms[roomX].userB.hand === 'Paper') lose();
      }
      if (rooms[roomX].userA.hand === 'Scissors') {
        if (rooms[roomX].userB.hand === 'Rock') lose();
        if (rooms[roomX].userB.hand === 'Scissors') draw();
        if (rooms[roomX].userB.hand === 'Paper') win();
      }
      if (rooms[roomX].userA.hand === 'Paper') {
        if (rooms[roomX].userB.hand === 'Rock') win();
        if (rooms[roomX].userB.hand === 'Scissors') lose();
        if (rooms[roomX].userB.hand === 'Paper') draw();
      }
      io.to(rooms[roomX].userA.id).emit('matchResult',
        [rooms[roomX].userA.result, rooms[roomX].userB.hand]);
      io.to(rooms[roomX].userB.id).emit('matchResult',
        [rooms[roomX].userB.result, rooms[roomX].userA.hand]);
    };

    const clearUser = () => {
      rooms[roomX].userA.id = '';
      rooms[roomX].userA.hand = '';
      rooms[roomX].userA.result = '';
      rooms[roomX].userA.room = '';
      
      rooms[roomX].userB.id = '';
      rooms[roomX].userB.hand = '';
      rooms[roomX].userB.result = '';
      rooms[roomX].userB.room = '';
    };

    if (rooms[roomX].userA.id === '') {
      createUserA();
      console.log('userA was created');
    } else {
      createUserB();
      console.log('userB was created');
      judgeMatch();
      console.log(rooms[roomX].userA);
      console.log(rooms[roomX].userB);
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