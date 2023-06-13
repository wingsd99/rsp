class Room {
  // インスタンスを生成せずに利用できる
  // 例: Room.rooms[1]
  static rooms = [];
  constructor() {
    this.players = [];
    this.password = null;
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
    return Room.rooms.find((room) => {
      let player = null;
      if (room) {
        player = room.players.find((player) => {
          if (player.id == sockId) return player;
        });
        if (player) return room;
      }
    })
  }

  checkPassword(pw) {
    if (this.password) {
      return this.password === pw;
    } else {
      return true;
    }
  }

  static deleteRoom(roomNumber) {
    Room.rooms = Room.rooms.filter(room => room != roomNumber);
  }

  checkPasswordExists() {
    if (this.password) {
      return 'Yes';
    } else {
      return 'No';
    }
  }
}

module.exports = Room;