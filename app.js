const express = require('express');
const app = express();
const server = require('http').createServer(app);
// socket.ioに引数serverを渡す省略記法
const io = require('socket.io')(server);

const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

app.set('view engine', 'ejs');
app.use(express.static('./public'));
app.use(express.urlencoded({ extended: true }));

const Room = require('./my-room.js');
const Player = require('./my-player.js');
const { roomValidator, accountValidator } = require('./my-validator.js');
const { session, checkSession, wrap } = require('./my-session.js');
const {
  connection,
  getMatchRecordsWithPromise,
  beginTransactionWithPromise,
  decideNewMatchIdWithPromise,
  insertResultWithPromise,
  commitWithPromise,
  rollbackWithPromise
} = require('./my-connection.js');

app.use(session);
app.use(checkSession);
io.use(wrap(session));

Room.rooms = Room.rooms.map(room => room = new Room());
console.log(`Room.rooms: ${JSON.stringify(Room.rooms)}`);

app.get('/', (req, res) => {
  // 開発用にこの部分を残しておく
  // (async () => {
  //   const aaa = await decideNewMatchIdWithPromise(connection);
  //   console.log(aaa);
  // })().catch((error) => console.log(error));
  // const bbb = ['xxx', 'yyy'];
  // const aaa = bbb.map(elm => {
  //   return ([
  //     '000',
  //     '111',
  //     '222'
  //   ]);
  // });
  // console.log('---bbb---');
  // console.log(aaa);

  // 部屋に入室している人数とPWの有無を表示
  // roomInfoの初期値は[[0, 'No'], [0, 'No'], [0, 'No']]
  // disconnectよりも先にroomInfoが返されるため、退出した本人がカウントされる
  const roomInfo = Room.rooms.map(room => {
    return [room.players.length, room.checkPasswordExists()];
  });

  console.log(`roomInfo: ${roomInfo}`);
  res.render(__dirname + '/views/top.ejs', { roomInfo: roomInfo });
});

app.get('/signup', (req, res) => {
  res.render('signup.ejs', { errorMessages: [] });
});

app.post('/signup', accountValidator,
  (req, res, next) => {
    // バリデーション
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.redirect('/');
      console.log(errors.array());
      return;
    }
    next();
  },
  // usernameの重複チェック
  (req, res, next) => {
    const errorMessages = [];
    connection.query(
      'SELECT * FROM users WHERE username = ?',
      [req.body.username],
      (error, results) => {
        if (results.length > 0) {
          errorMessages.push('The username is already taken');
          res.render('signup.ejs', { errorMessages: errorMessages });
          return;
        }
        next();
      }
    );
  },
  // アカウントの登録
  (req, res) => {
    bcrypt.hash(req.body.accountPassword, 10, (error, hash) => {
      connection.query(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [req.body.username, hash],
        (error, results) => {
          console.log(`INSERT results: ${JSON.stringify(results)}`);
          req.session.userId = results.insertId;
          req.session.username = req.body.username;
          res.redirect('/');
        }
      );
    });
  }
);

app.get('/login', (req, res) => {
  res.render('login.ejs', { errorMessages: [] });
});

app.post('/login', accountValidator, (req, res) => {
  const errorMessages = [];
  connection.query(
    'SELECT * FROM users WHERE username = ?',
    [req.body.username],
    (error, results) => {
      if (results.length === 0) {
        errorMessages.push('The username is not found');
        res.render('login.ejs', { errorMessages: errorMessages });
        return;
      }
      const hash = results[0].password;
      bcrypt.compare(req.body.accountPassword, hash, (error, isEqual) => {
        if (!isEqual) {
          errorMessages.push('The password is incorrect');
          res.render('login.ejs', { errorMessages: errorMessages });
          return;
        }
        req.session.userId = results[0].id;
        req.session.username = results[0].username;
        res.redirect('/');
      });
    }
  );
});

app.get('/logout', (req, res) => {
  req.session.destroy((_error) => {
    res.redirect('/');
  });
});

app.get('/record', (req, res) => {
  if (!req.session.userId) {
    res.redirect('/');
    return;
  }
  (async () => {
    const recordsFromDB = await getMatchRecordsWithPromise(connection, req);
    const records = [];
    recordsFromDB.forEach(record => {
      if (!records[record.match_id]) {
        // 添字<match_id>番の要素に配列を作成
        // records1[record.match_id].push ~ はエラーになる
        records[record.match_id] = [];
      }
      if (record.user_id === req.session.userId) {
        records[record.match_id].unshift([record.result, record.hand]);
      } else {
        records[record.match_id].push(record.nickname);
      }
    });
    records.filter(Boolean);
    res.render('record.ejs', { records: records });
  })();
});

app.post('/index', roomValidator, (req, res) => {
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

  if (!Room.rooms[roomNumber].checkPassword(password)) {
    res.redirect('/');
    return;
  }

  // passwordが入力済みならpassword機能をオンにする
  // 1人目の入室者のみ設定可能
  if (password && Room.rooms[roomNumber].players.length === 0) {
    Room.rooms[roomNumber].password = password;
  }

  res.render(__dirname + '/views/index.ejs', {
    roomNumber: roomNumber,
    nickname: nickname
  });
});

io.on('connection', (socket) => {
  // プレイヤーが部屋に入室した直後
  socket.on('join-room', (playerInfo) => {
    const room = Room.rooms[playerInfo[0]];
    // playerインスタンスを生成
    const player = new Player(playerInfo[1]);
    // プレイヤーIDをセットし、部屋のプレイヤーリストに登録
    player.id = socket.id;
    room.players.push(player);

    if (socket.request.session.userId) {
      player.sessionUserId = socket.request.session.userId;
      console.log(`player.sessionUserId: ${player.sessionUserId}`);
    }

    // 入室したユーザの情報を表示
    console.log(
      `Player join room: ${playerInfo[0] + 1},`,
      `player.id: ${player.id}, player.nickname: ${player.nickname}`
    );

    // 現在の部屋状況を入室者全員に伝える
    let msg = 'Ready for battle!';
    if (room.players.length === 1) {
      msg = 'Waiting for other players to join...';
    }
    // player.idを使ってmsgを送る
    room.players.map(player => io.to(player.id).emit('room-status', msg));
  });

  socket.on('player-select', (playerInfo) => {
    const room = Room.rooms[playerInfo[1]];
    const player = room.getPlayer(socket.id);
    player.hand = playerInfo[0];
    console.log(`Player ${player.nickname} selected ${player.hand}`);

    // 部屋に一人しかいなければ何もしない
    // このreturnはplayer-selectイベントを抜ける
    if (room.players.length === 1) return;
    
    // 部屋の全員が手を選んでいなければ未選択のプレイヤー一覧を送信
    // 入室人数が3人なら手が3つ選択されるまで待機
    if (!room.checkAllSelect()) {
      const undecidedPlayers = room.players.map(tmpPlayer => {
        return !tmpPlayer.hand && tmpPlayer.nickname;
      }).filter(Boolean);
      room.players.forEach(tmpPlayer => {
        io.to(tmpPlayer.id).emit('room-status',
          `Waiting other player's hand: player=${undecidedPlayers}`)
      });
      // このreturnはplayer-selectイベントを抜ける
      return;
    }

    (async () => {
      // 試合結果をクライアントへ送信
      room.players.forEach(tmpPlayer => {
        const resultToPlayers = [
          // room.getHandsList()で重複のない手の一覧を取得
          tmpPlayer.judgeHand(room.getHandsList()),
          room.players.map(elm => [elm.nickname, elm.hand])
        ];
        io.to(tmpPlayer.id).emit('room-status', 'Battle finished!');
        io.to(tmpPlayer.id).emit('matchFinish', resultToPlayers);
      });

      // 試合結果をmatchesテーブルへINSERT
      try {
        await beginTransactionWithPromise(connection);
        const matchId = await decideNewMatchIdWithPromise(connection);
        const matchResult = room.players.map(tmpPlayer => {
          return ([
            matchId,
            tmpPlayer.sessionUserId || 1,
            tmpPlayer.nickname,
            tmpPlayer.hand,
            tmpPlayer.judgeHand(room.getHandsList())
          ]);
        });
        await insertResultWithPromise(connection, matchResult);
        await commitWithPromise(connection);
      } catch (error) {
        await rollbackWithPromise(connection, error);
      } finally {
        room.players.map(tmpPlayer => tmpPlayer.hand = '');
      }
    })().catch(error => console.log(error));
  });
  
  socket.on('next-game', (roomId) => {
    const room = Room.rooms[roomId];
    // 現在の部屋状況を入室者全員に伝える
    let msg = 'Ready for battle!';
    // playerインスタンスが1つなら待機メッセージ
    if (room.players.length === 1) {
      msg = 'Waiting for other players to join...';
    }
    // 指定はなくても動作するがplayer.idで対象を絞っている
    room.players.map(player => io.to(player.id).emit('room-status', msg));
  });

  // クライアントとのWS通信が切れた際の処理
  socket.on('disconnecting', (_reason) => {
    // socket.idから部屋の番号を取得
    const room = Room.getRoomContainsPlayer(socket.id);
    room.exitPlayer(socket.id);
    // playerがいないならパスワードを削除
    if (room.players.length === 0) {
      room.password = '';
    }
  });
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`PORT: ${PORT}`);
});