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
const con = require('./my-connection.js');

app.use(session);
app.use(checkSession);
io.use(wrap(session));

Room.rooms = Room.rooms.map(room => room = new Room());
console.log(`Room.rooms: ${JSON.stringify(Room.rooms)}`);

app.get('/', async (req, res) => {
  // 開発用にこの部分を残しておく
  // const matchResults = [
  //   [1, 'q', 'Rock', 'WIN'], 
  //   [1, 'w', 'Scissors', 'LOSE']
  // ];
  // console.log('---...matchResults---\n', ...matchResults);
  // const placeHolder = matchResults.map((_result, index) => {
  //   return `((SELECT max_match_id + 1 FROM (SELECT MAX(match_id) AS max_match_id FROM matches) AS tmp_table) - ${index}, ?)`;
  // }).join(',');
  // console.log('---placeHolder---\n', placeHolder);

  // (async () => {
  //   const matchResults = [
  //     [1, 'testA', 'Rock', 'WIN'],
  //     [1, 'testB', 'Scissors', 'LOSE']
  //   ];
  //   const aaa = await con.insertResult(con.connection, matchResults);
  //   console.log(aaa);
  // })().catch((error) => console.log(error));

  // const bbb = ['xxx', 'yyy'];
  // const aaa = bbb.map((elm, index) => {
  //   return index;
  // });
  // console.log('---aaa---\n', aaa);

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

app.post('/signup',
  accountValidator,
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
  // usernameの重複チェック & アカウントの登録
  (req, res) => {
    (async () => {
      await con.beginTransaction(con.connection);
      const results = await con.tryRegisterUser(con.connection, req, bcrypt);
      req.session.userId = results.insertId;
      req.session.username = req.body.username;
      res.redirect('/');
      con.commit(con.connection);
    })().catch(error => {
      // 基本的にtryResisterUserのINSERTが失敗したときに以下の処理に進む
      console.log('---failed tryRegisterUser & rollback---');
      con.connection.rollback();
      res.render('signup.ejs', {
        errorMessages: ['The username is already taken']
      });
    });
  }
);

app.get('/login', (req, res) => {
  res.render('login.ejs', { errorMessages: [] });
});

app.post('/login',
  accountValidator, 
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.redirect('/');
      console.log(errors.array());
      return;
    }
    next();
  },
  (req, res) => {
    (async () => {
      const results = await con.authenticateUser(con.connection, req, bcrypt);
      req.session.userId = results[0].id;
      req.session.username = results[0].username;
      res.redirect('/');
    })().catch(() => {
      console.log('---failed authenticateUser---');
      res.render('login.ejs', {
        errorMessages: ['Either the username or password is incorrect']
      });
    });
  }
);

app.get('/logout', (req, res) => {
  req.session.destroy((error) => {
    res.redirect('/');
  });
});

app.get('/rename', (req, res) => {
  res.render('rename.ejs', { errorMessages: [] });
});

app.post('/rename',
  accountValidator,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.redirect('/');
      console.log(errors.array());
      return;
    }
    next();
  },
  (req, res) => {
    (async () => {
      await con.beginTransaction(con.connection);
      await con.renameOrResetPassword(con.connection, req, bcrypt);
      req.session.username = req.body.username;
      res.redirect('/');
      con.commit(con.connection);
    })().catch(error => {
      console.log('---failed renameOrResetPassword & rollback---');
      con.connection.rollback();
      res.render('rename.ejs', {
        errorMessages: ['The username is already taken']
      });
    });
  }
);

app.get('/record', (req, res) => {
  if (!req.session.userId) {
    res.redirect('/');
    return;
  }
  (async () => {
    const recordsFromDB = await con.fetchMatchRecords(con.connection, req);
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
    res.render('record.ejs', { records: records.filter(Boolean) });
  })().catch(error => {
    console.log(error);
    res.redirect('/');
  });
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
    const player = new Player(playerInfo[1]);
    player.id = socket.id;
    room.players.push(player);
    if (socket.request.session.userId) {
      player.sessionUserId = socket.request.session.userId;
      console.log(`player.sessionUserId: ${player.sessionUserId}`);
    }
    console.log(
      `Player join room: ${playerInfo[0] + 1},`,
      `player.id: ${player.id}, player.nickname: ${player.nickname}`
    );
    let msg = 'Ready for battle!';
    if (room.players.length === 1) msg = 'Waiting for other players to join...';
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
    // 部屋の全員が手を選んでいなければ未選択のプレイヤー名を送信
    // 例: 入室人数が3人なら手が3つ選択されるまで待機
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
        await con.beginTransaction(con.connection);
        const newMatchId = await con.decideNewMatchId(con.connection);
        const matchResults = room.players.map(tmpPlayer => {
          return ([
            newMatchId,
            tmpPlayer.sessionUserId || 1,
            tmpPlayer.nickname,
            tmpPlayer.hand,
            tmpPlayer.judgeHand(room.getHandsList())
          ]);
        });
        await con.insertMatchResults(con.connection, matchResults);
        con.commit(con.connection);
      } catch (error) {
        con.rollback(con.connection, error);
      } finally {
        room.players.map(tmpPlayer => tmpPlayer.hand = '');
      }
    })().catch(error => console.log(error));
  });

  socket.on('next-game', (roomId) => {
    const room = Room.rooms[roomId];
    let msg = 'Ready for battle!';
    if (room.players.length === 1) msg = 'Waiting for other players to join...';
    // 指定はなくても動作するがplayer.idで対象を絞っている
    room.players.map(player => io.to(player.id).emit('room-status', msg));
  });

  // クライアントとのWS通信が切れた際の処理
  socket.on('disconnecting', (reason) => {
    // socket.idから部屋の番号を取得
    const room = Room.getRoomContainsPlayer(socket.id);
    room.exitPlayer(socket.id);
    // playerがいないならパスワードを削除
    if (!room.players.length) room.password = '';
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`PORT: ${PORT}`);
});