# FIRST BLAST

Three.js で作られた、初心者向け3DアリーナFPSのブラウザプロトタイプです。PCのキーボード・マウス操作と、スマートフォンのタッチ操作に対応します。

## 起動方法

ES Modulesを利用するため、ファイルを直接開かずローカルHTTPサーバーを使用してください。

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開き、**BLAST OFF** を押します。

### 操作

- PC: `WASD` 移動、マウスで視点、クリックで射撃、`Space` ジャンプ、`Shift` ダッシュ、`R` リロード
- スマートフォン: 左スティックで移動、右側をドラッグして視点操作、画面上の射撃・JUMP・DASHボタン
- CPUを5回倒すと勝利、5回倒されるとゲームオーバーです。

## GitHub Pagesへの公開方法

1. このフォルダーをGitHubリポジトリのデフォルトブランチへpushします。
2. GitHubのリポジトリで **Settings → Pages** を開きます。
3. **Build and deployment** のSourceで **Deploy from a branch** を選びます。
4. デフォルトブランチと **/(root)** を選択して **Save** を押します。
5. 数分後に表示される `https://<ユーザー名>.github.io/<リポジトリ名>/` を開きます。

ビルド工程は不要です。Three.jsはCDNから読み込むため、プレイ時にはインターネット接続が必要です。
