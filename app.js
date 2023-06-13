const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
// socket.ioに引数serverを渡す省略記法
const io = require('socket.io')(server);
const {body, validationResult} = require('express-validator');

const PORT = 3000;

// RoomとPlayerクラスをモジュールとして読み込む
const Room = require('./Room.js');
const Player = require('./Player.js');

app.set('view engine', 'ejs');
app.use(express.static('./public'));
app.use(express.urlencoded({extended:true}));

const validator = [
  body('room').isInt().not().isEmpty(),
  body('nickname').isLength({min: 1, max: 8})
    // 特殊文字を取り除く
    .blacklist(['<', '>', '&', '\'', '"', '/'])
    .not().isEmpty(),
  body('password').isLength({min: 0, max: 8})
    .blacklist(['<', '>', '&', '\'', '"', '/'])
];

app.get('/', (req, res) => {
  // 部屋に入室している人数とPWの有無を表示
  // roomInfo = [[0, 'No'], [0, 'No'], [0, 'No'],]
  const roomInfo = [...Array(3)].map((_, idx) => {
    if (Room.rooms[idx + 1]) {
      return [Room.rooms[idx + 1].players.length, Room.rooms[idx + 1].checkPasswordExists()];
    } else {
      return [0, 'No'];
    }
  });
  console.log(`roomInfo: ${JSON.stringify(roomInfo)}`);
  res.render(__dirname + '/views/top.ejs', {roomInfo: roomInfo});
});

app.post('/index', validator, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.redirect('/');
    console.log(errors.array());
    return;
  }
  const roomNumber = req.body.room;
  const nickname = req.body.nickname;
  const password = req.body.password;
  console.log(`password: ${password}`);

  // Roomクラスにその部屋が存在するかを判定
  if (!Room.rooms[roomNumber]) {
    // Roomインスタンスを生成
    const room = new Room();
    // 例: Room.rooms[1]
    Room.rooms[roomNumber] = room;
    if (password) {
      Room.rooms[roomNumber].password = password;
    }
  } else {
    if (!Room.rooms[roomNumber].checkPassword(password)) {
      res.redirect('/');
      return;
    }
  } 
  res.render(__dirname + '/views/index.ejs', {
    roomNumber: roomNumber,
    nickname: nickname
  });
});

io.on('connection', (socket) => {
  // プレイヤーが部屋に入室した直後
  socket.on('join-room', (playerInfo) => {
    // Roomクラスのrooms配列をroom変数で管理
    const room = Room.rooms[playerInfo[0]];
    // playerインスタンスを生成
    const player = new Player(playerInfo[1]);

    // プレイヤーIDをセットし、部屋のプレイヤーリストに登録
    player.id = socket.id;
    // rooms配列のplayers配列に追加
    room.players.push(player);
    // 入室したユーザの情報を表示
    console.log(`Player join room: ${playerInfo[0]}, player.id: ${player.id}, player.nickname: ${player.nickname}`);
    // roomsの数を表示(rooms[0]は空)
    console.log(`The number of rooms: ${Room.rooms.length - 1}`);

    // 現在の部屋状況を入室者全員に伝える
    // ここから下の部分は重複しているため、updateRoomStatus()にするべきかもしれない
    let msg = 'Ready for battle!';
    // playerインスタンスが1つなら待機メッセージ
    if (room.players.length === 1) {
      msg = 'Waiting for other players to join...';
    }
    console.log(msg);
    // player.idを使ってmsgを送る
    room.players.map(player => io.to(player.id).emit('room-status', msg));
  });

  // クライアントとのWS通信が切れた際の処理
  socket.on('disconnecting', (_reason) => {
    // socket.idから部屋の番号を取得
    const room = Room.getRoomContainsPlayer(socket.id);
    // socket.idと一致するプレイヤーを指定して削除
    Room.rooms.map(tmpRoom => tmpRoom.exitPlayer(socket.id));
    console.log(`socket.id: ${socket.id}`);
    console.log(`room: ${JSON.stringify(room)}`);
    // playerがいないならパスワードを削除
    console.log(`room.players: ${JSON.stringify(room.players)}`);
    if (room.players.length === 0) {
      Room.deleteRoom(room);
      console.log(`room is: ${typeof(room)}`);
    }
  });

  // プレイヤーハンド選択時
  socket.on('player-select', (playerInfo) => {
    // 部屋とプレイヤーのオブジェクトを取得する
    // 例: ['rock', 1]
    const room = Room.rooms[playerInfo[1]];
    // socket.idと一致するプレイヤーを指定
    const player = room.getPlayer(socket.id);
    // 選択された手を当該プレイヤーにセット
    player.hand = playerInfo[0];
    console.log(`Player ${player.nickname} selected ${player.hand}`);

    // 部屋に一人しかいなければ何もしない
    // このreturnはplayer-selectイベントを抜ける
    if (room.players.length === 1) return;
    
    // 部屋の全員が手を選んでいなければ未選択のプレイヤー一覧を送信
    // 入室人数が3人なら手が3つ選択されるまで待機
    if (!room.checkAllSelect()) {
      // let playersUnselect = room.players.map((tmpPlayer, idx) => {
      // // tmpPlayerの手が選択済みならfalseを返す(右の式は評価されない)
      // // tmpPlayerの手が未選択(左の式がtrue)ならidx+1の値を返す
      //   return !tmpPlayer.hand && idx + 1;
      // // idxが整数ならtrueを返す(0以下の負の整数と空値もtrue)
      // // falseが配列として入ってしまうため、それを除いた配列を返す
      // // .filter(Boolean) で同じことを実現できる
      // }).filter(Boolean);
      // // .filter(playerUnselect => Number.isInteger(playerUnselect));

      const playerUnselect = room.players.map((tmpPlayer, idx) => {
        return !tmpPlayer.hand && tmpPlayer.nickname;
      }).filter(Boolean);

      console.log(`${playerUnselect} unselect a hand`);
      room.players.forEach(tmpPlayer => {
        io.to(tmpPlayer.id).emit('room-status', `Waiting other player's hand: player=${playerUnselect}`)
      });
      // このreturnはplayer-selectイベントを抜ける
      return;
    }

    // 全員の手が出揃ったら判定
    // 重複のない手の一覧を取得
    const handsList = room.getHandsList();
    room.players.map(tmpPlayer => {
      console.log(`nickname: ${tmpPlayer.nickname}, hand: ${tmpPlayer.hand}, result: ${tmpPlayer.judgeHand(handsList)}`);
      const result = [
        tmpPlayer.judgeHand(handsList),
        room.players.map(elm => [elm.nickname, elm.hand])
      ];
      io.to(tmpPlayer.id).emit('room-status', 'Battle finished!');
      io.to(tmpPlayer.id).emit('matchResult', result);
    });
    // 判定後は全員の手をリセット
    room.players.map(tmpPlayer => tmpPlayer.hand = '');
  });
  
  socket.on('next-game', (roomID) => {
    const room = Room.rooms[roomID];
    // 現在の部屋状況を入室者全員に伝える
    let msg = 'Ready for battle!';
    // playerインスタンスが1つなら待機メッセージ
    if (room.players.length === 1) {
      msg = 'Waiting for other players to join...';
    }
    console.log(msg);
    // 指定はなくても動作するがplayer.idで対象を絞っている
    room.players.map(player => io.to(player.id).emit('room-status', msg));
  });
});

server.listen(PORT, () => {
  console.log(`PORT: ${PORT}`);
});