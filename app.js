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
  res.render(__dirname + '/views/index.ejs', { roomNumber: roomNumber });
});

io.on('connection', (socket) => {
  // プレイヤーが部屋に入室した直後
  socket.on('join-room', (roomID) => {
    const player = new Player();
    const room = Room.rooms[roomID];

    // プレイヤーIDをセットし、部屋のプレイヤーリストに登録
    player.id = socket.id;
    room.players.push(player);
    console.info(`Join player into ${roomID}: player.id=${player.id}`);
    console.info(`Current room status: ${Room.rooms}`);

    // 現在の部屋状況を入室者全員に伝える
    let msg = 'Ready for battle!';
    if (room.players.length == 1) {
      msg = 'Waiting for other players to join...';
    }
    console.info(msg);
    room.players.map(player => io.to(player.id).emit('status', msg));
  });

  // プレイヤーが落ちたらRoomからプレイヤーを削除
  socket.on('disconnecting', (_reason) => {
    Room.rooms.map(room => room.exitPlayer(socket.id));
  });

  // プレイヤーハンド選択時
  socket.on('playerSelect', (playerInfo) => {
    // 部屋とプレイヤーのオブジェクトを取得し、選択された手を当該プレイヤーにセット
    const selectedHand = playerInfo[0];
    const room = Room.rooms[playerInfo[1]];
    const player = room.getPlayer(socket.id);
    player.hand = selectedHand;
    console.info(`Player ${player.id} selected hand: ${selectedHand}`);

    // 部屋に一人しかいなければ何もしない
    if (room.players.length == 1) return;

    // 部屋の全員が手を選んでいなければ未選択のプレイヤー一覧を送信
    if (!room.checkAllSelected()) {
      const notSelectedPlayers =
        room.players.map((tmpPlayer, idx) => (tmpPlayer.hand == '') && idx + 1)
          .filter(idx => Number.isInteger(idx));
      room.players.map((tmpPlayer) =>
        io.to(tmpPlayer.id).emit(
          'status',
          `Waiting other player's hand: playerID=${notSelectedPlayers}`
        ));
      return;
    }

    // 全員の手が出揃ったら判定
    const handsList = (room.getHandsList());
    room.players.map(tmpPlayer => {
      console.info(`Player ${tmpPlayer.id}: hand=${tmpPlayer.hand}, result=${tmpPlayer.judgeHand(handsList)}`);
      const result = {
        result: tmpPlayer.judgeHand(handsList),
        playerHands: room.players.map((enemy) => enemy.hand)
      };
      io.to(tmpPlayer.id).emit('status', 'Battle finished!');
      io.to(tmpPlayer.id).emit('matchResult', result);
    });

    // 判定後は全員の手をリセット
    room.players.map(tmpPlayer => tmpPlayer.hand = '');
  });
});

class Room {
  static rooms = [];
  constructor() {
    this.players = [];
  }

  getPlayer(playerID) {
    return this.players.find(
      (player) => player.id == playerID
    );
  }

  exitPlayer(playerID) {
    this.players = this.players.filter(user => user.id != playerID);
  }

  checkAllSelected() {
    return this.players.map(player => player.hand)
      .reduce((prev, cur) => prev && cur, true);
  }

  getHandsList() {
    return new Set(this.players.map(player => player.hand));
  }
}

class Player {
  static HAND_PATTERNS = {
    "Rock": 0,
    "Scissors": 1,
    "Paper": 2
  }
  static JUDGE_PATTERNS = ["DRAW", "LOSE", "WIN"];

  constructor(room) {
    this.id = '';
    this.hand = '';
    this.room = room;
  }

  judgeHand(hands) {
    if (hands.size == 1 || hands.size == 3) return "DRAW";

    const myHand = Player.HAND_PATTERNS[this.hand];
    const otherHand = Player.HAND_PATTERNS[
      Array.from(hands).find(hand => this.hand != hand)
    ];
    return Player.JUDGE_PATTERNS[(myHand - otherHand + 3) % 3];
  }
}

server.listen(PORT, () => {
  console.log(`PORT: ${PORT}`);
});

