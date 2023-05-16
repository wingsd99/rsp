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
  if (!Room.rooms[req.params.id]) {
    const room = new Room();
    Room.rooms[req.params.id] = room;
  }
  res.render(__dirname + '/views/index.ejs', {roomNumber: roomNumber});
});

io.on('connection', (socket) => {
  const clientsCount = io.engine.clientsCount;
  console.log(clientsCount, socket.id);

  socket.on('join-room', (roomID) => {
    const player = new User();
    player.id = socket.id;
    Room.rooms[roomID].users.push(player);
    console.info(`Join player into ${roomID}: player.id=${player.id}`);
    console.info(Room.rooms);
  });

  socket.on('playerSelect', (playerInfo) => {
    const selectedHand = playerInfo[0];
    const roomID = playerInfo[1];
    const playerID = socket.id;
    const player = Room.rooms[roomID].users.find(
      (player) => { return player.id == playerID; }
    );
    player.hand = selectedHand;
    console.info(player);

    const win = () => {
      Room.rooms[roomID].userA.result = 'WIN';
      Room.rooms[roomID].userB.result = 'LOSE';
    };
    const draw = () => {
      Room.rooms[roomID].userA.result = 'DRAW';
      Room.rooms[roomID].userB.result = 'DRAW';
    };
    const lose = () => {
      Room.rooms[roomID].userA.result = 'LOSE';
      Room.rooms[roomID].userB.result = 'WIN';
    };

    const judgeMatch = () => {
      if (Room.rooms[roomID].userA.hand === 'Rock') {
        if (Room.rooms[roomID].userB.hand === 'Rock') draw();
        if (Room.rooms[roomID].userB.hand === 'Scissors') win();
        if (Room.rooms[roomID].userB.hand === 'Paper') lose();
      }
      if (Room.rooms[roomID].userA.hand === 'Scissors') {
        if (Room.rooms[roomID].userB.hand === 'Rock') lose();
        if (Room.rooms[roomID].userB.hand === 'Scissors') draw();
        if (Room.rooms[roomID].userB.hand === 'Paper') win();
      }
      if (Room.rooms[roomID].userA.hand === 'Paper') {
        if (Room.rooms[roomID].userB.hand === 'Rock') win();
        if (Room.rooms[roomID].userB.hand === 'Scissors') lose();
        if (Room.rooms[roomID].userB.hand === 'Paper') draw();
      }
      io.to(Room.rooms[roomID].userA.id).emit('matchResult',
        [Room.rooms[roomID].userA.result, Room.rooms[roomID].userB.hand]);
      io.to(Room.rooms[roomID].userB.id).emit('matchResult',
        [Room.rooms[roomID].userB.result, Room.rooms[roomID].userA.hand]);
    };

    const clearUser = () => {
      Room.rooms[roomID].userA.id = '';
      Room.rooms[roomID].userA.hand = '';
      Room.rooms[roomID].userA.result = '';
      Room.rooms[roomID].userA.room = '';
      
      Room.rooms[roomID].userB.id = '';
      Room.rooms[roomID].userB.hand = '';
      Room.rooms[roomID].userB.result = '';
      Room.rooms[roomID].userB.room = '';
    };

    if (Room.rooms[roomID].userA.id === '') {
      createUserA();
      console.log('userA was created');
    } else {
      createUserB();
      console.log('userB was created');
      judgeMatch();
      console.log(Room.rooms[roomID].userA);
      console.log(Room.rooms[roomID].userB);
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
class Room {
  static rooms = [];
  constructor() {
    this.users = [];
  }
}

class User {
  constructor(room) {
    this.id = '';
    this.hand = '';
    this.result = '';
    this.room = room;
  }
}
