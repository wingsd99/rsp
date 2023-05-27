const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
// socket.ioに引数serverを渡す省略記法
const io = require('socket.io')(server);

const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('./public'));

app.get('/', (req, res) => {
  res.render(__dirname + '/views/top.ejs');
});

app.get('/index/:id', (req, res) => {
  const roomNumber = req.params.id;
  // Roomクラスにその部屋が存在するかを判定
  if (!Room.rooms[req.params.id]) {
    // Roomインスタンスを生成
    const room = new Room();
    // 例: Room.rooms[1]
    Room.rooms[req.params.id] = room;
  }
  res.render(__dirname + '/views/index.ejs', { roomNumber: roomNumber });
});

io.on('connection', (socket) => {
  // プレイヤーが部屋に入室した直後
  socket.on('join-room', (roomID) => {
    // playerインスタンスを生成
    const player = new Player();
    // Roomクラスのrooms配列をroom変数で管理
    const room = Room.rooms[roomID];

    // プレイヤーIDをセットし、部屋のプレイヤーリストに登録
    player.id = socket.id;
    // Roomインスタンスのplayers配列に追加
    room.players.push(player);
    // 入室したユーザの情報を表示
    console.log(`Join player into ${roomID}: player.id=${player.id}`);
    // roomsの数+1を表示(rooms[0]は空)
    console.log(`Number of rooms: ${Room.rooms.length - 1}`);

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

  // プレイヤーが落ちたらRoomからプレイヤーを削除
  socket.on('disconnecting', (_reason) => {
    // socket.idと一致するプレイヤーを指定して削除
    Room.rooms.map(room => room.exitPlayer(socket.id));
  });

  // プレイヤーハンド選択時
  socket.on('player-select', (playerInfo) => {
    // playerInfoは[playerHand, room]
    // 部屋とプレイヤーのオブジェクトを取得する
    // 選択された手を当該プレイヤーにセット
    // 例: ['rock', 1]
    const room = Room.rooms[playerInfo[1]];
    // socket.idと一致するプレイヤーを指定
    const player = room.getPlayer(socket.id);
    player.hand = playerInfo[0];
    console.log(`Player ${player.id} selected ${player.hand}`);

    // 部屋に一人しかいなければ何もしない
    // このreturnはplayer-selectイベントを抜ける
    if (room.players.length === 1) return;
    
    // 部屋の全員が手を選んでいなければ未選択のプレイヤー一覧を送信
    // 入室人数が3人なら手が3つ選択されるまで待機
    if (!room.checkAllSelect()) {
      const playersUnselect =
      // mapメソッドは第1引数に各要素、第2引数にインデックス番号を受け取る
      // tmpPlayerの手が未選択かつ、
      // インデックス番号が次のplayerが存在しない(最後の入室者)
      room.players.map((tmpPlayer, idx) => !tmpPlayer.hand && idx + 1)
        // idxが整数ならtrueを返す(0以下の負の整数と空値もtrue)
        // falseが配列として入ってしまうため、それを除いた配列を返す
        // trueを返したtmpPlayerをnotSelectedPlayersとして扱う
        .filter(idx => Number.isInteger(idx));
      console.log(`Player ${playersUnselect} unselect`);
      // for文と同じ使い方で部屋にいる全員に送信
      // roomはスコープ内で特定されているから、io.emitだけでいいのでは?
      room.players.map((tmpPlayer) => {
        io.to(tmpPlayer.id).emit('room-status', `Waiting other player's hand: playerID=${playersUnselect}`)
      });
      // このreturnはplayer-selectイベントを抜ける
      return;
    }

    // 全員の手が出揃ったら判定
    // 重複のない手の一覧を取得
    const handsList = room.getHandsList();
    room.players.map(tmpPlayer => {
      console.log(`Player=${tmpPlayer.id}, hand=${tmpPlayer.hand}, result=${tmpPlayer.judgeHand(handsList)}`);
      const result = {
        result: tmpPlayer.judgeHand(handsList),
        playerHands: room.players.map((elm) => elm.hand)
      };
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
    // player.idを使ってmsgを送る
    room.players.map(player => io.to(player.id).emit('room-status', msg));
  });
});

class Room {
  // インスタンスを生成せずに利用できる
  // 例: Room.rooms[1]
  static rooms = [];
  constructor() {
    this.players = [];
  }

  getPlayer(playerID) {
    // players配列の中でplayerIDと一致するものを返す
    return this.players.find(
      (player) => player.id == playerID
    );
  }

  exitPlayer(playerID) {
    // playerIDと一致するuser.idを除外する(それ以外を返す)
    this.players = this.players.filter(user => user.id != playerID);
  }

  checkAllSelect() {
    // 新しい配列を生成
    // player要素のplayer.handを返す
    return this.players.map(player => player.hand)
      // player.handが空文字列でなければcurはtrue
      // 初期値はtrue(最初のprevはtrue)
      // previousとcurrentが両方trueならtrueを返す
      .reduce((prev, cur) => prev && cur, true);
  }

  getHandsList() {
    // player.handの重複を除去した配列風Setオブジェクトを生成
    return new Set(this.players.map(player => player.hand));
  }
}

class Player {
  static HAND_PATTERNS = {
    'Rock': 0,
    'Scissors': 1,
    'Paper': 2
  }
  static JUDGE_PATTERNS = ['DRAW', 'LOSE', 'WIN'];

  constructor(room) {
    this.id = '';
    this.hand = '';
    this.room = room;
  }

  judgeHand(hands) {
    // 引数handsはplayer.handの配列風Setオブジェクト
    // 全員の手が同じまたは3種類の手が出た場合は処理終了
    if (hands.size == 1 || hands.size == 3) return 'DRAW';

    // 2種類の手が出た場合に処理継続
    // 例: Player.HAND_PATTERNS['rock']ならmyHandは0
    const myHand = Player.HAND_PATTERNS[this.hand];
    const otherHand = Player.HAND_PATTERNS[
      // handsから新しい配列を生成する
      // this.handと異なる手を返す
      // 例: 'scissors'
      Array.from(hands).find(hand => this.hand != hand)
    ];
    // マイナスを取り除いて0から2の値に揃えた結果を返す
    return Player.JUDGE_PATTERNS[(myHand - otherHand + 3) % 3];
    // myHand ↓
    // | |0|1|2|
    // |0|0|1|2|
    // |1|2|0|1|
    // |2|1|2|0|
  }
}

server.listen(PORT, () => {
  console.log(`PORT: ${PORT}`);
});

