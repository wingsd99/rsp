class Player {
  static HAND_PATTERNS = {
    'Rock': 0,
    'Scissors': 1,
    'Paper': 2
  }
  static JUDGE_PATTERNS = ['DRAW', 'LOSE', 'WIN'];

  constructor(nickname) {
    this.id = null;
    this.nickname = nickname;
    this.hand = null;
  }

  judgeHand(hands) {
    // 引数handsはplayer.handの配列風Setオブジェクト
    // 全員の手が同じまたは3種類の手が出た場合は処理終了
    // 配列風Setオブジェクトの要素数取得はlengthではなくsizeメソッド
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

module.exports = Player;