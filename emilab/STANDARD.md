# Sophia アプリ制作 標準仕様（STANDARD.md）

最終更新：2026-07-29

このドキュメントは、Sophiaで制作するWebアプリの共通仕様をまとめたものです。
新規アプリ制作時や既存アプリの更新時は、本仕様を基準とします。

---

# 1. 基本構成

## ファイル構成

index.html
styles.css
app.js
manifest.json
README.md

---

# 2. ホーム画面アイコン

## iPhone

apple-touch-icon.png

サイズ

180 × 180

index.html

```html
<link rel="apple-touch-icon" href="apple-touch-icon.png">
```

---

## Android

manifest.json

icon-192.png

192 × 192

icon-512.png

512 × 512

purpose

any maskable

---

# 3. PWA設定

manifest.json

・display：standalone

・start_url：index.html

・theme_color：#ffffff

・background_color：#ffffff

---

# 4. 音声配信

音声保存先

Google Drive

スプレッドシート

Google Drive共有URLを登録

アプリ

app.jsで

Google Drive共有URL

↓

ファイルID抽出

↓

https://drive.google.com/uc?export=download&id=FILEID

へ変換

再生方法

<audio controls>

フォールバック

「音声を開く」

---

# 5. 動画配信

Google Drive共有URL

クラス別配信対応

新規

通常

全体

---

# 6. キャッシュ

GAS

Public Cache

120秒

ブラウザ

sessionStorage

120秒

---

# 7. ログイン

ID

ひらがな氏名

パスワード

先生設定

利用状態

利用中

休会

退会

---

# 8. 共通デザイン

背景動画対応

レスポンシブ

スマホ最適化

---

# 9. 更新時チェック

□ manifest更新

□ アイコン更新

□ README更新

□ GitHubへPush

□ GitHub Pages確認

□ iPhone確認

□ Android確認

---

# 10. 更新履歴

## 2026-07-29

・ホーム画面アイコンをSophia標準へ変更

・PWA設定を標準化

・音声再生をGoogle Driveプレビューからブラウザ標準audioへ変更

# Sophia標準仕様バージョン

Ver.1.0
2026-07-29

初版作成

Ver.1.1
（今後更新）


## システム仕様

・Google Apps Script連携
・Googleスプレッドシート管理
・生徒ログイン
・クラス別配信
・sessionStorage利用




## Standard History

### Ver.1（2026-07-29）
- PWA対応
- manifest.json追加
- apple-touch-icon対応
- icon-192 / icon-512追加
- iPhone・Androidホーム画面追加対応
