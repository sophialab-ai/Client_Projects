# STANDARD.md

# Sophia App Standard
案件：サトエリ「売り込まずに伝わる冒険」

## 基本情報

- 制作：Sophia
- 公開方法：GitHub Pages
- 開発構成：HTML / CSS / JavaScript
- PWA対応：対応済み

---

## ファイル構成

- index.html
- styles.css
- app.js
- manifest.json
- apple-touch-icon.png（180×180）
- icon-192.png（192×192）
- icon-512.png（512×512）

---

## PWA設定

### manifest.json

- name：売り込まずに伝わる冒険
- short_name：サトエリ
- display：standalone
- start_url：./
- scope：./
- background_color：#ffffff
- theme_color：#ffffff

### index.html

以下を設定済み。

- manifest
- apple-touch-icon
- favicon
- theme-color

---

## アイコン仕様

ホーム画面追加に対応。

### iPhone

- apple-touch-icon.png を使用

### Android

- manifest.json の icon-192.png
- manifest.json の icon-512.png

を使用。

---

## 実装方針

既存のUI・CSS・JavaScriptの動作は変更せず、
PWA対応のみ追加実装する。

---

## 更新履歴

### Ver.1（2026-07）

- manifest.json 追加
- PWA対応
- iPhone／Android ホーム画面アイコン対応
