# P0-03 OCR クライアント API（Functions 呼び出し）

このチケットは、フロントエンドから OCR callable を呼ぶための薄い API 層を作る単位です。UI や導線はまだ公開しません。

## ゴール

- `ocrHandwrittenMemo` callable をフロントから呼び出せる
- エラーを UI が扱いやすい形に正規化できる（通信失敗/認証/入力不備など）
- フラグ OFF では呼び出し経路が存在しない（=既存 UX に影響しない）

## 対象

- [src/app/firebase/firebase.ts](../../../src/app/firebase/firebase.ts)
- [src/app/auth/AuthContext.tsx](../../../src/app/auth/AuthContext.tsx)
- （追加予定）OCR 用のクライアントモジュール（例: `src/app/ocr/...`）

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

達成チェック:

- [ ] `httpsCallable(functions, "ocrHandwrittenMemo")` を使って呼び出せる
- [ ] 成功時に抽出テキストを受け取れる
- [ ] 失敗時に UI が分岐可能なエラー形（message/code）に整形できる

## 作業内容

### 1) OCR API ラッパー

- 入力型/出力型を定義する（最小）
- 例外を握りつぶさず、UI へ返す

### 2) 依存の整理

- Functions インスタンスは既存の `getFirebaseFunctions()` を使用する

## 非ゴール

- OCR 画面/編集画面の実装
- 保存（書籍メモ/記録メモ）の実装
