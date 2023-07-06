class Room {
  // [ <3 empty items> ]ではなく[undefined, undefined, undefined]を想定
  // room1はRoom.rooms[0]
  static rooms = [...Array(3)];
  constructor() {
    this.players = [];
    // nullではなくundefinedを用いる
    this.password;
  }

  getPlayer(playerID) {
    return this.players.find(player => player.id === playerID);
  }

  exitPlayer(playerID) {
    this.players = this.players.filter(player => player.id !== playerID);
  }

  checkAllSelect() {
    return this.players.every(player => player.hand);
  }

  getHandsList() {
    // player.handの重複を除去した配列風Setオブジェクトを生成
    return new Set(this.players.map(player => player.hand));
  }

  static getRoomContainsPlayer(sockID) {
    return Room.rooms.find(room => {
      return room.players.find(player => player.id === sockID && player) && room;
    });
  }

  checkPassword(pw) {
    return this.password ? this.password === pw : true;
  }

  checkPasswordExists() {
    return this.password ? 'Yes' : 'No';
  }
}

module.exports = Room;