# P0-TK-025 休憩除外durationの整合化と編集挙動の明確化

Status: ✅ 完了

このチケットは、タイマー計測で「休憩時間を差し引いた計測時間」を正として扱い、表示・保存・編集の挙動を一貫させるための修正です。

## 背景

現状は、記録表示に使う `record.duration` が読み込み時に `startTime/endTime` 差分で再計算されるため、休憩を挟んだ計測で実測より長く表示されるケースがある。

- タイマー停止時に保存する `duration` は休憩除外で正しい
- ただし読み込み時の正規化で `end-start` が優先されるため、休憩時間が再混入する

## ゴール

- 記録カードと集計で表示される計測時間が、常に休憩除外の `duration` と一致する
- タイマー保存時と手動編集時のルールを明確に分離し、挙動を予測可能にする

## 方針

1. 読み込み時は `duration` を正として優先する
- `duration` が存在する場合はそれを採用
- `duration` が欠損している旧データのみ `startTime/endTime` 差分で補完

2. タイマー保存時は実開始時刻と休憩区間を保存する
- `startTime` は実開始時刻（最初に計測開始を押した時刻）
- `endTime` は停止時刻
- `pauseIntervals`（`[{ startTime, endTime }]`）として休憩区間を保存する
- `duration` は `end-start-休憩合計` の計測時間（休憩除外）を保存する

3. 手動編集時は `start/end` 主体で `duration` を更新する
- 記録編集画面で日時を変更した場合は `duration = endTime - startTime`
- これにより、ユーザーが終了時刻を延ばせば計測時間も増える

## 受け入れ条件

- [x] 休憩あり計測（開始 -> 一時停止 -> 再開 -> 終了）で保存された記録の表示時間が、休憩除外の値になる
- [x] 休憩あり計測で、保存レコードの `startTime` が実開始時刻と一致する
- [x] 休憩区間が `pauseIntervals` として保存される
- [x] 記録一覧カードで `duration` が表示され、`start/end` 差分由来で増えることがない
- [x] 月次合計/日次グループ合計が `record.duration` ベースで一致する
- [x] 記録編集画面で終了時刻を変更して保存すると `duration` が変更される
- [x] 編集後も `startTime/endTime/duration` の整合（不正な負値なし）が保たれる

## 実装対象

- `src/app/context/AppContext.tsx`
  - `normalizeDurationSeconds` の優先順位修正（`duration` 優先）
  - `pauseIntervals` の読み込み・正規化
- `src/app/components/TimerSection.tsx`
  - 実開始時刻の保持
  - 一時停止/再開の区間記録（`pauseIntervals`）
  - 停止時に `startTime/endTime/pauseIntervals/duration` を整合保存
- `src/app/pages/RecordSingleView.tsx`
  - 編集保存時は現行通り `duration = end-start` を維持（仕様として明文化）
- `src/app/types/index.ts`
  - `ReadingRecord` に `pauseIntervals` を追加

## テスト

- [x] `normalizeDurationSeconds` の単体テスト追加
  - `duration` あり + `start/end` ありのとき `duration` を採用
  - `duration` 欠損時のみ `start/end` 差分を採用
  - `pauseIntervals` がある場合に `start/end` 差分から休憩時間を除外できる
- [x] タイマー停止保存のテスト追加
  - 休憩ありで `duration` が休憩除外になる
  - 保存 payload の `startTime` が実開始時刻と一致する
  - 保存 payload に `pauseIntervals` が含まれる
- [x] 編集保存のテスト追加
  - `endTime` 変更で `duration` が更新される

## 非ゴール

- 既存データの一括補正マイグレーション
- 記録編集画面への「duration直接入力UI」追加

## 注意

- 既存の誤差データは本チケットでは自動補正しないため、必要なら別チケットでバックフィル方針を検討する
- 影響範囲が表示/集計/編集にまたがるため、回帰確認は一覧・詳細・月次集計まで行う
