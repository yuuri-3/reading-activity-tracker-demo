# P0-02 OCR callable（Cloud Functions）追加（画像非保持）

このチケットは、クライアントから呼び出せる OCR のサーバ処理（callable）を追加する単位です。UI は未公開のままでも反映でき、失敗しても既存 UX に影響しない構成にします。

## ゴール

- callable function（例: `ocrHandwrittenMemo`）を追加し、画像入力からテキスト抽出結果を返せる
- アプリ（サーバ含む）は画像を永続保存しない（処理後に破棄する）
- 個人情報が写り得る前提で、ログ/監視に画像データや抽出テキストを残さない（最小ログ）

## 決定事項（このチケットで確定）

- OCR 方式（MVP）: Gemini（Vertex AI 経由）で「文字起こし（抽出）」を行う
  - 本 callable は要約/整形/レコメンドは行わず、抽出テキスト（編集前提）を返す
- 入力仕様（MVP）:
  - `mimeType`（`image/jpeg` / `image/png`）+ 純 base64（data URL は不可）
  - 1 リクエスト 1 枚（複数枚は非対応）
  - クライアント側で可能なら「JPEG へ変換 + リサイズ + 圧縮」して送る（サーバ負荷/失敗率/コストを下げる）
  - サーバ側で `mimeType` 許可リストと、base64 デコード後のサイズ上限を検証する（上限: 4MB = 4,194,304 bytes）
  - サイズ超過時のエラー詳細（案）: `invalid-argument` + `details: { reason: "payload-too-large", maxBytes: 4194304 }`
  - 追加実装が増える場合は JPEG のみ運用に寄せてよい（その場合も callable 契約は維持する）
- 認証: Firebase Auth の認証済みユーザーのみ（匿名認証ユーザーは許可）
- 認証情報/Secret 方針: API キー運用よりも IAM（Vertex AI）を優先する
- リージョン方針: Functions と外部 OCR 呼び出しは原則同一リージョンに揃える（Firestore のロケーションに合わせて決定）
  - 判断理由: ユーザーの主対象が日本中心であり、Firestore 作成時に「東京相当」を選択済みという前提を踏まえる
  - ロケーション ID は `asia-northeast1`（Tokyo）を想定（※コンソール表示のロケーション ID で最終確認する）
- Functions 実行設定（MVP）:
  - `timeoutSeconds`: 120（慎重寄せ。UI 側は解析中表示を出す）
  - `memory`: 1GiB（推奨）
- 乱用/コスト事故対策（MVP）:
  - App Check: 本番環境では必須（dev はデバッグ/任意運用を許容）
  - レート制限: 認証ユーザー単位で制限（1 分あたり 5 回、1 日あたり 30 回。値は運用で調整可能）
    - 日次上限の区切り: JST（日本時間）の 0 時
  - 将来の課金拡張: レート制限は「クォータ（利用枠）のチェック/消費」として実装し、課金（プラン別上限）へ拡張できる形にする
    - 将来の基本案（変更可能）: 月あたりの OCR 実行回数（=画像 1 枚 = 1 実行）を課金/プランの単位とする
    - 月次クォータの区切り: JST（日本時間）基準で日次と揃える（毎月 1 日 0:00 JST でリセット）
- 将来の切替: 実装は「OCR プロバイダ差し替え可能（Gemini / Vision OCR）」な構造にし、クライアントの callable 契約は維持する

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
- [ ] OCR プロバイダを差し替え可能な構造になっている（将来 Vision OCR へ切替しやすい）
- [ ] UI 側で解析中の表示を出せる（タイムアウトを 120 秒に寄せても UX が破綻しない）
- [ ] 本番環境で App Check が必須になっている（不足時は `permission-denied` 等で判定可能）
- [ ] レート制限が動作し、超過時に UI が判定可能なエラーで復帰できる
- [ ] 将来の課金/プラン別クォータへ拡張しやすい（利用枠チェックが 1 箇所に集約されている）

## 作業内容

### 1) callable の追加

- 入力（MVP）: 画像 1 枚
  - 形式: `mimeType` + 純 base64（data URL は不可）
  - `mimeType` 許可: `image/jpeg`（優先）/ `image/png`（追加実装が増えない範囲で許可）
  - サイズ: base64 デコード後のバイト数で上限チェック（上限: 4MB = 4,194,304 bytes）
- 出力: 抽出テキスト（+必要なら requestId）
- バリデーション:
  - `mimeType` が許可リスト外なら `invalid-argument`
  - サイズ上限超過は `invalid-argument`（UI が判定できるよう details に `reason`/`maxBytes` を入れる）
- 認可/保護:
  - Auth 必須（匿名認証ユーザーは許可）
  - App Check（本番必須）: 不足時は `permission-denied`（details に `reason: "app-check-required"` など）
  - レート制限（ユーザー単位）: 超過時は `resource-exhausted`（details に `reason: "rate-limit"` と `retryAfterSeconds` など）
  - 実装方針: レート制限は「クォータチェック/消費」処理を関数化して 1 箇所に集約し、将来の課金（プラン別上限・無料枠）へ差し替え可能にする
    - 実装方式（MVP）: Firestore にユーザー単位のカウンタを持ち、Transaction でインクリメントして上限判定する
      - 分バケット: `YYYYMMDDHHmm` 単位（例: 202601171230）
      - 日バケット: JST の日付で `YYYYMMDD` 単位（例: 20260117）
      - 将来: 月バケット `YYYYMM` の追加（課金/プラン別クォータ。JST 基準）に拡張可能

### 判断メモ（自分用）

- callable はリクエストサイズ制約があるため、上限ギリギリを狙わず余裕を持たせる
- base64 はおおむねデータ量が約 1.33 倍（$\times 4/3$）になるため、デコード後サイズと転送サイズは分けて考える
- 端末実装差（iOS の HEIC 等）や前処理漏れを考慮しつつ、P0 は「確実に通る」ことを優先
- クライアント側でリサイズ/圧縮して典型サイズを小さくし、サーバ側の上限は典型サイズの 3〜4 倍程度に置く
- サイズ超過は `invalid-argument` で明確に弾き、UI 側で「画像が大きいので縮小して再試行」など復帰可能な案内にする

### 2) 外部 OCR の呼び出し

- OCR 方式（MVP）: Gemini（Vertex AI 経由）
  - 出力方針: 文字起こし（抽出）に限定し、推測/補完/要約を促さない（編集前提）
  - 将来: 精度重視になった場合は Vision OCR へ切替できるよう、プロバイダ層を分離する
- コスト優先で「追加の整形 API 呼び出し」は行わない（整形は最小）

### 3) セキュリティ/運用

- 認証情報（推奨）: IAM（Vertex AI）を優先する（API キー方式を採用する場合は Secret で管理する）
- 画像データはメモリ上で扱い、処理後破棄（永続化しない）
- ログ方針: 画像データおよび抽出テキストはログ/監視に残さない（必要なら requestId とメタ情報のみ）
- 乱用対策: App Check とレート制限で多層防御し、外部 API コストの暴発を防ぐ

## 非ゴール

- 同意 UI（初回注意喚起）の実装
- フロントの導線/画面の公開

## 注意

- callable の入力サイズ上限に抵触する可能性があるため、UI 側の表示方針（文言/導線）は別チケットで詰める
