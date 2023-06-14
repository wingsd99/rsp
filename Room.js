class Room {
  // インスタンスを生成せずに利用できる
  // e.g. room1はRoom.rooms[0]
  static rooms = [];
  constructor() {
    this.players = [];
    this.password;
  }

  getPlayer(playerID) {
    // players配列の中でplayerIDと一致するものを返す
    return this.players.find(player => player.id == playerID);
  }

  exitPlayer(playerID) {
    // playerIDと一致するplayer.idを除外する(それ以外を返す)
    this.players = this.players.filter(player => player.id != playerID);
  }

  checkAllSelect() {
    // 新しい配列を生成
    // player要素のplayer.handを返す
    return this.players.map(player => player.hand)
      // player.handが空文字列でなければcurはtrue
      // 初期値はtrue(最初のprevはtrue)
      // previousとcurrentが両方trueならtrueを返す
      // player.handが1つ以上falseなら最終的にfalseが返される
      .reduce((prev, cur) => prev && cur, true);
  }

  getHandsList() {
    // player.handの重複を除去した配列風Setオブジェクトを生成
    return new Set(this.players.map(player => player.hand));
  }

  static getRoomContainsPlayer(sockId) {
    const theRoom = Room.rooms.find((room) => {
      let player = null;
      if (room) {
        player = room.players.find((player) => {
          if (player.id == sockId) return player;
        });
        if (player) return room;
      }
    })
    console.log(`getRoomContainsPlayer: ${JSON.stringify(theRoom)}`);
    return theRoom;
  }

  checkPassword(pw) {
    if (this.password) {
      return this.password === pw;
    } else {
      return true;
    }
  }

  // 部屋を消してしまうとroomsのindex番号がずれて部屋2が部屋1になってしまう
  // static deleteRoom(noPlayerRoom) {
  //   console.log(`noPlayerRoom: ${Room.rooms.indexOf(noPlayerRoom)}`);
  //   console.log(`before delete Room.rooms: ${JSON.stringify(Room.rooms)}`);
  //   Room.rooms = Room.rooms.filter(room => room != noPlayerRoom);
  //   console.log(`after delete Room.rooms: ${JSON.stringify(Room.rooms)}`);
  // }

  checkPasswordExists() {
    if (this.password) {
      return 'Yes';
    } else {
      return 'No';
    }
  }
}

module.exports = Room;