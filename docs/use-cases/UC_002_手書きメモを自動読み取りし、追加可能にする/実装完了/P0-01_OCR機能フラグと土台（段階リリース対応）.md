# P0-01 OCR 機能フラグと土台（段階リリース対応）

このチケットは、OCR 機能を段階的に本番へ反映しても既存ユーザー体験が壊れないように、機能を「既定 OFF で隠したまま積み上げる」ための土台を作る単位です。

## ゴール

- OCR 関連の UI/導線を、環境変数フラグで出し分けできる（本番は既定 OFF）
- フラグ OFF の状態で、本番に反映しても既存機能/既存導線が一切変わらない
- OCR フローで使うローカル状態（保存先デフォルト、同意済み）を端末ローカルに保存できる

## 対象

- [src/vite-env.d.ts](../../../src/vite-env.d.ts)
- [src/app/App.tsx](../../../src/app/App.tsx)
- （追加予定）OCR 関連のフラグ判定/ローカルストレージの薄いユーティリティ
  - 置き場所: `src/app/ocr/` 配下（OCR 以外からは env/localStorage を直参照しない）

## 実装状況

Status: ✅ 実装完了（2026-01-12）

- 検証: `npm test -- --run` / `npm run typecheck` OK

## 受け入れ条件

達成チェック:

- [x] `VITE_ENABLE_OCR_HANDWRITTEN_MEMO` を導入し、`import.meta.env.VITE_ENABLE_OCR_HANDWRITTEN_MEMO === "true"` の場合のみ OCR 関連 UI/導線が表示される（未設定・それ以外は OFF 扱い）
- [x] 本番は既定 OFF とし、prod では `VITE_ENABLE_OCR_HANDWRITTEN_MEMO` を未設定で運用できる
- [x] OCR のフラグ参照/永続化参照は `src/app/ocr/` 配下に集約され、OCR 以外から env/localStorage を直参照しない
- [x] フラグ OFF の状態で、OCR 関連の UI/導線が一切表示されず、既存画面の見た目・遷移・動作が変化しない（「3) 検証」の手動チェックリストを満たす）
- [x] 端末ローカル状態が `yomzoy:ocrHandwrittenMemoState:v1` に保存/復元できる
  - `consentAccepted: boolean`（同意状態）
  - `defaultDestination: "book" | "record"`（保存先デフォルト、既定値は `"book"`）
  - 保存先を選択した場合、その選択が次回以降の既定値として復元される
- [x] `localStorage` が読めない/壊れている場合は未同意＋既定値（`"book"`）で開始する
- [x] `localStorage` が書けない場合でもアプリは落とさずに継続し、次回起動時は未同意＋既定値（`"book"`）から開始する

## 作業内容

### 1) 機能フラグの追加（既定 OFF）

- `import.meta.env.VITE_ENABLE_OCR_HANDWRITTEN_MEMO` を参照できるようにする
- ON 判定は `import.meta.env.VITE_ENABLE_OCR_HANDWRITTEN_MEMO === "true"` のときのみ（未設定・それ以外は OFF 扱い）
- 本番は既定 OFF とするため、prod では `VITE_ENABLE_OCR_HANDWRITTEN_MEMO` を未設定で運用する
- 参照箇所は OCR 関連の導線/画面に限定し、既存機能へ影響を出さない
- フラグ参照の入口を 1 箇所に集約する
  - 例: `isOcrHandwrittenMemoEnabled()`（内部で `import.meta.env...` を解釈する）

### 2) 端末ローカルの状態保存（低コスト）

- 保存スコープ: 端末単位（`localStorage`）
  - 同一ユーザーでも端末間で状態は同期されない（新しい端末では「同意」は未同意扱い・保存先は既定値から開始）
- 保存先デフォルト（直前選択）: `localStorage` に保存する
- 初回注意喚起の同意: `localStorage` に保存する
- `localStorage` 参照の入口を 1 箇所に集約する

  - 例: `ocrHandwrittenMemoLocalState`（同意状態・保存先デフォルトを読み書き）

- key 名は UC\*001 の `yomzoy:...` 形式に寄せる
  - キー: `yomzoy:ocrHandwrittenMemoState:v1`
  - 値: JSON
    - 例: `{ "v": 1, "consentAccepted": true, "defaultDestination": "book" }`
    - `defaultDestination`: `"book" | "record"`
    - 既定値: `"book"`（書籍メモ）
  - 「直前選択」の扱い: ユーザーが保存先を選択したら、その選択を次回以降の既定値として復元する

### 3) 検証（フラグ OFF で既存 UX が変わらないこと）

- 前提: `VITE_ENABLE_OCR_HANDWRITTEN_MEMO` を未設定、もしくは `"true"` 以外にして起動する
- 期待: OCR 関連の UI/導線が一切表示されず、既存の見た目・遷移・動作が変化しない
- 手動チェックリスト（広め）
  - 認証導線（ログイン/ログアウト、リロード）で違和感がない
  - タイマー画面（TimerPage）で動作・表示が変わらない
  - 書籍一覧/詳細（BookCollectionView / BookSingleView）で動作・表示が変わらない
  - 記録メモ詳細（RecordSingleView）で動作・表示が変わらない
  - サンクタム（SanctumPage）で動作・表示が変わらない
  - タグ管理（TagManagementPage）で動作・表示が変わらない

### 4) 例外時フォールバック（localStorage が使えない場合）

- 想定: ブラウザ設定・プライベートモード・容量不足等で `localStorage` の読み書きが失敗することがある
- 方針: 失敗してもアプリ全体は継続し、OCR フローの状態は安全側に倒す
  - 読めない場合: `consentAccepted = false`（未同意扱い）、`defaultDestination = "book"`（既定値）として開始する
  - 書けない場合: その端末では状態を保持できないが、画面は落とさずに継続する（次回起動時は未同意・既定値から開始）

## 非ゴール

- OCR 画面/保存機能の実装
- 起動導線の最終決定（どの画面から開始するか）

## 注意

- 本チケット単体を反映してもユーザー向け機能は増えない（隠し機能の土台のみ）
- 端末間同期（同意状態・保存先デフォルトをアカウントに紐づけて別端末でも復元）は別チケットで検討する
