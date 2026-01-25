# P0-07 OCR 結果を「記録メモ」として保存（新規記録）

このチケットは、OCR で編集したテキストを「新規の記録（ReadingRecord）」として保存できるようにする単位です。フラグ ON の範囲内で実装し、既存の記録一覧/並び替えに自然に乗せます。

## ゴール

- OCR 編集済みテキストを、新規記録のメモとして保存できる
- タグは複数選択でき、低コストならその場で新規タグ作成も可能
- 日時は単一入力でよく、低コスト案として `startTime=endTime` に保存する（duration は 0）

## 対象

- （追加予定）OCR フローの保存先選択 UI（記録メモ側）
- [src/app/pages/RecordSingleView.tsx](../../../src/app/pages/RecordSingleView.tsx)
- [src/app/components/TagMultiSelectInput.tsx](../../../src/app/components/TagMultiSelectInput.tsx)

## 実装状況

Status: ✅ 完了

## 受け入れ条件

達成チェック:

- [x] OCR 編集テキストを「新規記録」として保存できる
- [x] タグを複数選択できる（必要なら新規作成もできる）
- [x] 日付+時間（単一）を入力でき、デフォルトは現在時刻
- [x] OCR テキストが空でも保存できる（理由: OCR 導線だが手入力のみで記録作成したい/認識失敗でもレコードだけ先に作成したいケースに対応）
- [x] 保存後、記録一覧に 1 件追加され、入力日時で並び替えられている
- [x] 保存後、画像と OCR 編集テキストはリセットされる（日時・タグは維持）
- [x] duration は MVP では入力しない（保存値は 0 想定）

## 作業内容

### 1) 保存先: 記録メモ（新規記録）

- タグ: TagMultiSelectInput の再利用を基本
  - `onCreateOption` を渡すことで「Enter/『「xxx」を追加』」による新規作成が可能
- 日時入力: `datetime-local`（既存の手動追加と同等の見た目/操作感）
- 保存後の挙動: 保存成功トースト表示のみ（画面維持）
- 保存後の挙動: 画像と OCR 編集テキストはリセット（日時・タグは維持）

### 2) データ保存

- `ReadingRecord.memo` に OCR 編集テキスト
- `ReadingRecord.startTime` / `endTime` にユーザー入力日時（同一値）
- `duration` は 0 想定
- OCR テキストが空でも保存可
  - 理由: OCR 導線だが手入力のみで記録作成したい/認識失敗でもレコードだけ先に作成したいケースに対応
- 記録一覧の並び順は入力日時（`startTime`）を基準にする

## 非ゴール

- 既存記録への追記/上書き
- duration 入力
- 画像の保持/保存
