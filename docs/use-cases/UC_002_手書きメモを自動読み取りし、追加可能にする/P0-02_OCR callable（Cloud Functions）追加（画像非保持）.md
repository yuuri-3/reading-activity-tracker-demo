# P0-02 OCR callable（Cloud Functions）追加（画像非保持）

このチケットは、クライアントから呼び出せる OCR のサーバ処理（callable）を追加する単位です。UI は未公開のままでも反映でき、失敗しても既存 UX に影響しない構成にします。

## ゴール

- callable function（例: `ocrHandwrittenMemo`）を追加し、画像入力からテキスト抽出結果を返せる
- アプリ（サーバ含む）は画像を永続保存しない（処理後に破棄する）
- 個人情報が写り得る前提で、ログ/監視に画像データや抽出テキストを残さない（最小ログ）

## 対象

- [functions/src/index.ts](../../../functions/src/index.ts)
- [functions/package.json](../../../functions/package.json)
- （必要なら）Functions の環境変数/Secret 設定（外部 OCR API キーなど）

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

達成チェック:

- [ ] callable `ocrHandwrittenMemo` がデプロイできる
- [ ] 認証済みユーザーのみ呼び出せる（匿名認証ユーザーも含めて許可）
- [ ] 画像データを Firestore/Storage 等へ永続保存しない
- [ ] Functions のログに画像（base64 等）を出力しない
- [ ] 失敗時はエラー種別（invalid-argument / unauthenticated / internal 等）がクライアントで判定できる

## 作業内容

### 1) callable の追加

- 入力: 画像（形式は実装開始時に確定。例: base64+mimeType / 圧縮後データ 等）
- 出力: 抽出テキスト（+必要なら requestId）

### 2) 外部 OCR の呼び出し

- OCR 方式（専用 OCR/画像理解 AI 等）は本チケット着手時に選定する
- コスト優先で「追加の整形 API 呼び出し」は行わない（整形は最小）

### 3) セキュリティ/運用

- API キー等は Functions の Secret/環境変数で管理する
- 画像データはメモリ上で扱い、処理後破棄（永続化しない）

## 非ゴール

- 同意 UI（初回注意喚起）の実装
- フロントの導線/画面の公開

## 注意

- callable の入力サイズ上限に抵触する可能性があるため、サイズ制約とエラー表示方針は別チケット（UI 側）で詰める
