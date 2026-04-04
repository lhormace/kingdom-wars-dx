# Kingdom Wars DX プログラミング設計書

## 1. 目的

本書は、ソースコードの責務分離、モジュール構成、変更方針、実装上の制約を定義する。

## 2. リポジトリ構成

- [index.html](/Users/lhormace/workspace/kingdom-wars-dx/index.html)
  - アプリ起動
  - バージョン読込
  - スクリプトロード
- [style.css](/Users/lhormace/workspace/kingdom-wars-dx/style.css)
  - 全体スタイル
- [game.js](/Users/lhormace/workspace/kingdom-wars-dx/game.js)
  - 現行本編の中心
- [src/gameEnhancements.js](/Users/lhormace/workspace/kingdom-wars-dx/src/gameEnhancements.js)
  - 補助ライブラリ戦況表示
- [src/library-demo.js](/Users/lhormace/workspace/kingdom-wars-dx/src/library-demo.js)
  - ライブラリデモ起動
- [src/libraryAdapters.js](/Users/lhormace/workspace/kingdom-wars-dx/src/libraryAdapters.js)
  - ライブラリ個別初期化
- [vendor/](/Users/lhormace/workspace/kingdom-wars-dx/vendor)
  - 同梱ライブラリ
- [version.txt](/Users/lhormace/workspace/kingdom-wars-dx/version.txt)
  - 表示 / キャッシュ回避用 version
- [scripts/update-version.sh](/Users/lhormace/workspace/kingdom-wars-dx/scripts/update-version.sh)
  - version 更新スクリプト
- [.githooks/pre-commit](/Users/lhormace/workspace/kingdom-wars-dx/.githooks/pre-commit)
  - commit 前 version 更新

## 3. 実装責務

### 3.1 `game.js`

責務:

- `MainScene` の生成
- ゲーム状態管理
- マップ生成
- 戦闘処理
- 入力処理
- 描画処理
- HUD 更新
- オーバーレイ制御
- 補助演出連携

設計上の課題:

- 単一ファイルに責務が集中している
- 今後は以下への分割が望ましい
  - `scene/`
  - `domain/`
  - `render/`
  - `input/`
  - `systems/`

### 3.2 `src/gameEnhancements.js`

責務:

- 各ライブラリの補助表示マウント
- 戦況スナップショット受信
- 本編とは独立した演出描画

### 3.3 `src/libraryAdapters.js`

責務:

- 各ライブラリデモの最小動作保証
- ライブラリ差異吸収
- 動作確認用デモ

## 4. 主要クラス / 関数設計

### 4.1 `MainScene`

公開的責務:

- `create()`
- `update()`
- `startStage()`
- `showTitleOverlay()`
- `performMovementDirection()`
- `tryMoveHero()`
- `resolveBattle()`
- `pickupThings()`
- `castMagic()`
- `triggerAngelEvent()`
- `triggerDevilEvent()`
- `renderAll()`
- `updateHud()`

### 4.2 補助関数

- `tileKey(x, y)`
  - 厳密タイル一致判定用キー生成
- `findEnemyAt(x, y)`
  - 敵タイル検索
- `findFreeTile(...)`
  - 空きタイル検索
- `findFreeRect(...)`
  - 矩形空き領域検索

## 5. データモデル設計

### 5.1 王

```js
{
  x,
  y,
  displayX,
  displayY,
  hp,
  maxHp,
  hasExcalibur
}
```

### 5.2 敵

```js
{
  type,
  x,
  y,
  displayX,
  displayY,
  hp,
  maxHp,
  power,
  color,
  size
}
```

### 5.3 補助職

```js
{
  mana,
  maxMana,
  regen,
  cooldown,
  recoveryDelay
}
```

### 5.4 エフェクト

```js
{
  type,
  x,
  y,
  size,
  expiresAt
}
```

## 6. 入力設計

- 移動入力は `movementInput` に正規化
- 押し始めは `justPressed`
- 長押しは `isDown`
- 最新入力優先は `lastPressedAt`
- 開始直後は canvas へフォーカス

## 7. 描画設計

- ロジック位置と表示位置を分離する
- 表示は `displayX/displayY` を使用する
- 描画はフレームごとに `renderAll()` で再構成する
- ライブラリ戦況表示は本編ステートのスナップショットを受け取る

## 8. バージョン設計

- バージョンは [version.txt](/Users/lhormace/workspace/kingdom-wars-dx/version.txt) を正本とする
- `index.html` は起動時に `version.txt` を読む
- `?v=` パラメータに version を付加する
- `style.css` とスクリプト読込にも version を付与する

## 9. Git フック設計

- commit 前に `scripts/update-version.sh` を実行
- `version.txt` を自動更新
- `core.hooksPath=.githooks` を利用

## 10. 今後のリファクタリング指針

- `game.js` を責務別に分割する
- 状態管理と描画を分離する
- 戦闘、イベント、入力を独立モジュール化する
- 型情報導入を検討する
- 回帰防止のための簡易テスト導入を検討する

