# FIRST BLAST

Three.jsで作られた、オフライン1対1アリーナFPSです。左右対称マップでCPUと一命制のラウンドを戦い、先に5ラウンド取ると勝利します。

特定作品のロゴ・モデル・音源・画像は使用せず、高速なデュエル、4スロットのロードアウト、スライドを中心にした独自のブラウザゲームとして構成しています。

## 主な機能

- 5ラウンド先取の1対1 CPU DUEL
- Primary / Secondary / Melee / Utilityの4スロット
- 各スロット2種類、合計8種類の装備
- ADS、スプリント、しゃがみ、スライド、クイック近接、クイックUtility
- ヘッドショットと距離減衰
- 遮蔽物で止まるCPUの実弾
- 方向別被弾表示、撃破コールアウト、低HP警告などの戦闘フィードバック
- ラウンド間に最大3個まで選ぶ6種類の試合内ギア
- RUSHER / TACTICIAN / MARKSMANのCPU戦闘スタイル
- CROSSLINE / POCKET / LONGSHOTの3アリーナ
- 射撃場と移動する練習ターゲット
- 永続保存されるロードアウト、設定、契約、KEY
- 契約とDUEL勝利で得るKEYを使い、武器カラー、着弾エフェクト、称号を解放するSTYLE LOCKER
- 命中率、撃破、総ダメージ、最大一撃、被ダメージ、クラッチを表示するリザルト
- PCとタッチ操作に対応

## 起動

ES ModulesとThree.js CDNを使うため、ファイルを直接開かずローカルHTTPサーバーを使います。

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開いてください。初回読み込み時はThree.js取得のためインターネット接続が必要です。

## PC操作

- `WASD`: 移動
- マウス: 視点
- 左クリック: 射撃・使用
- 右クリック: ADS
- `Shift`: スプリント
- `C` または `Ctrl`: しゃがみ／移動中はスライド
- `Space`: ジャンプ
- `R`: リロード
- `1`〜`4`: 武器スロット切替
- `Q`: クイック近接
- `E`: クイックUtility
- `Esc`: メニューへ戻る

## ゲームモード

### DUEL

プレイヤーかCPUのHPが0になるとラウンド終了です。次のラウンドでは位置、HP、弾薬がリセットされ、先に5本取った側が試合に勝利します。

### 射撃場

反撃しないターゲットで、射撃、ヘッドショット、近接、Utilityを自由に練習できます。ターゲットを倒すと別位置に再出現します。

## ロードアウト

- Primary: Pulse Rifle / Scatter Blaster
- Secondary: Spark Pistol / Bubble Sidearm
- Melee: Energy Baton / Boost Blade
- Utility: Bounce Grenade / Heal Capsule

選択内容、契約進捗、獲得KEY、設定はブラウザの `localStorage` に保存されます。

## 現在の範囲

- オンライン対戦、アカウント、サーバー権威判定は未実装です。
- CPUは軽量なステアリング方式で、ナビゲーションメッシュは使用していません。
- BGMは将来追加用で、現在の音はWeb Audioで合成した効果音のみです。
