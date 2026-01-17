# P0-03 OCR クライアント API（Functions 呼び出し）

このチケットは、フロントエンドから OCR callable を呼ぶための薄い API 層を作る単位です。UI や導線はまだ公開しません。

## ゴール

- `ocrHandwrittenMemo` callable をフロントから呼び出せる
- エラーを UI が扱いやすい形に正規化できる（通信失敗/認証/入力不備など）
- フラグ OFF では呼び出し経路が存在しない（=既存 UX に影響しない）

補足（公開制御 / 将来の課金展望）:

- いまはフラグで未公開にするが、将来的に「無課金ユーザーは利用不可」になる可能性がある
- そのため、UI の導線制御に加えて **API 層でも二重ガード**し、利用不可のときは Functions を呼ばずに失敗 Result を返せるようにする

補足（方針）:

- UI 側が扱いやすいよう、OCR API は例外を throw せず **Result Union** を返す
  - 成功: `{ ok: true, data: ... }`
  - 失敗: `{ ok: false, error: ... }`

## 対象

- [src/app/firebase/firebase.ts](../../../src/app/firebase/firebase.ts)
- [src/app/auth/AuthContext.tsx](../../../src/app/auth/AuthContext.tsx)
- （追加予定）OCR 用のクライアントモジュール（例: `src/app/ocr/api/...`）

## 実装状況

Status: ✅ 完了

## 受け入れ条件

達成チェック:

- [x] `httpsCallable(functions, "ocrHandwrittenMemo")` を使って呼び出せる
- [x] 成功時に抽出テキストを受け取れる
- [x] 失敗時に UI が分岐可能なエラー形に整形できる（`code`/`class`/`message`/`reason?`/`retryAfterSeconds?`）
- [x] フラグ OFF では OCR 呼び出しが UI から到達不能である（既存 UX に影響しない）
- [x] フラグ OFF で API が直接呼ばれても Functions を呼ばず `{ ok: false, error: { reason: "disabled", ... } }` を返せる

エラー仕様（フロント側の正規化）:

- `code`: callable error の `code` を正規化したもの（`functions/` プレフィックス除去）
- `class`: `missing | temporary | other`（既存の分類ロジックに合わせる）
- `message`: UI 表示/ログ用のメッセージ
- backend から details が来る場合は `reason` / `retryAfterSeconds` を拾って UI で参照可能にする

`reason` の方針:

- `disabled`: クライアント側の機能 OFF（フラグ OFF など）で呼び出し自体を拒否した
- `not-entitled`: 将来の課金などにより利用権限がない（このチケットでは形だけ用意し、実際の判定/導線は別チケットで実装）

想定される主な失敗（例）:

- 未ログイン: `unauthenticated`
- App Check 必須/不正: `permission-denied` + `reason=app-check-required|app-check-invalid`
- 画像が大きすぎる: `invalid-argument` + `reason=payload-too-large`
- レート制限: `resource-exhausted` + `reason=rate-limit`（`retryAfterSeconds` を含む想定）
- 一時障害: `unavailable` / `deadline-exceeded` など（`class=temporary`）
- callable 未配備/古い: `not-found` / `unimplemented`（`class=missing`）

## 作業内容

### 1) OCR API ラッパー

- 入力型/出力型を定義する（最小）
- throw ではなく Result Union を返す（UI が分岐しやすい）
- エラーを正規化して返す（`code`/`class`/`message` + 必要に応じて `reason`/`retryAfterSeconds`）
- エラーを正規化して返す（`code`/`class`/`message` + `reason`/`retryAfterSeconds`）
- 二重ガード: フラグ OFF のときは `httpsCallable` を呼ばずに `{ ok: false, error: { reason: "disabled", ... } }` を返す

例（型イメージ）:

- `OcrHandwrittenMemoResult = { ok: true; data: { requestId: string; text: string } } | { ok: false; error: { code?: string; class: "missing" | "temporary" | "other"; message: string; reason?: string; retryAfterSeconds?: number } }`

### 2) 依存の整理

- Functions インスタンスは既存の `getFirebaseFunctions()` を使用する
- callable のエラー分類は既存の `functionsError` を使用する

## 非ゴール

- OCR 画面/編集画面の実装
- 保存（書籍メモ/記録メモ）の実装
- 課金状態（entitlement）の判定・導線・サーバ側の利用制御
