# TK-006 タイマー tick による広範囲再レンダーを抑制

このチケットは、100ms tick が `AppContext` を通じて広範囲の再レンダーを誘発し得る状態を改善し、体感性能と電池消費を安定させます。

## 背景 / 課題

- 現状は `AppContext` 内で 100ms 間隔の `setInterval` により `timerState.elapsedTime` を更新している
- `AppContext.Provider` の `value` に `timerState` が含まれるため、tick のたびに Provider value が更新され、`useApp()` を利用する Timer と無関係な UI も更新され得る
- 目的は「タイマーは滑らかに更新しつつ、Timer と無関係な UI の更新を抑える」こと

## ゴール

- タイマー動作中も入力/スクロールが重くならない
- `useApp()` 購読範囲が無駄に揺れない
- 画面遷移/誤操作で Timer 画面を閉じても、計測は継続する（次回表示時に経過時間が正しく復元される）

## 決定事項（仕様確定）

- タイマー表示は **秒単位（`mm:ss`）で滑らかに更新できれば OK**（100ms 更新は必須ではない）
- tick の更新間隔は **1000ms**（秒単位の表示要件を満たしつつ、電池消費とレンダリング負荷を安定化）
- `elapsedTime` は「壁時計（`Date.now()`）から算出した経過秒」を扱う（保存時は既存同様 `Math.floor` で秒に丸める）
- 永続化（localStorage）の前提は現状に準拠する
  - 保存するのは `isRunning / startTime / pausedTime`（tick ごとに保存しない）
  - 復元時、`isRunning=true` の場合は `pausedTime + (now-startTime)` から `elapsedTime` を再計算する

## 対象

- App state: [src/app/context/AppContext.tsx](../../../src/app/context/AppContext.tsx)
- タイマー表示を含むページ/コンポーネント（TimerPage/TimerSection 等）
- Storybook / テスト用 Provider: [src/app/stories/MockAppProvider.tsx](../../../src/app/stories/MockAppProvider.tsx)

## 実装状況

Status: ✅ 完了（プレビュー実機確認・React DevTools 確認済み）

## 受け入れ条件

達成チェック:

- [x] tick 中に `AppContext.Provider` の value が不要に変化しない（Timer と無関係な UI が過剰に再レンダーしない）
- [x] タイマー表示は **秒単位で自然に更新** される（`mm:ss` が不自然に止まらない）
- [x] 既存の永続化（localStorage）挙動が壊れない

確認チェック（手順を含む）:

- [x] React DevTools の Highlight updates（必要に応じて Profiler）で、タイマー動作中に Timer と無関係な画面要素が継続的に更新されていない
- [x] Timer 計測を開始した状態で TimerPage 以外へ遷移しても、画面全体が tick ごとに点滅（更新ハイライト）し続けない
- [x] タイマー画面の表示（秒表示の切り替わり）が不自然に止まらない
- [x] リロード/復帰時にタイマーが意図した状態（再開/一時停止/リセット）で復元される

補足（永続化の期待挙動）:

- 計測中にリロードしても、計測は継続している扱いで復元される
- 一時停止中にリロードしても、一時停止状態（停止中の経過秒）で復元される
- リセット後は永続化データが消える（もしくはデフォルト状態として復元される）

## 作業内容

### 1) 方針決定

- 採用: **案 A**（Timer 専用 Provider/Context に責務を分離して購読範囲を限定）
  - `AppContext` から `timerState` と timer 操作関数を外し、`TimerProvider` + `useTimer()` に移す
  - tick は `TimerProvider` に閉じ、Timer を読まないコンポーネントは更新対象から外す
  - 表示は秒単位で良いため、更新間隔は **1000ms** を基本とする
    - 目的: 電池消費とレンダリング負荷の安定化（100ms を維持する必要はない）
- 参考: 案 B（tick を下げる）は、AppContext から切り離さない限り「購読範囲の問題」が残るため今回は不採用
- 参考: 案 C（`useMemo` 安定化）は、同一 Provider に `elapsedTime` が残る限り根治にならないため今回は不採用

### 2) 実装

- 影響が小さい方針から段階的に適用
- Timer は画面横断で継続動作する（誤って Timer 画面を閉じても継続したい）ため、`TimerProvider` は App ルート側に配置する
  - ただし「tick による更新」は `TimerProvider` 内に閉じ、Timer を読まないコンポーネントへの波及を防ぐ
  - アプリが閉じている間（タブ/アプリ終了）は JS の interval は動作しない前提とし、再起動時に `startTime` から壁時計で経過時間を復元できる状態を維持する（現状の localStorage 復元方針に準拠）

#### TK-009 との境界

- 本チケット（TK-006）は Timer 周りの購読範囲問題を最小単位で解消する
- `AppContext` のさらなる責務分割（Firestore/repositories 切り出し、Search/Guest notice の分離など）は [TK-009](TK-009_AppContext責務分割と購読範囲整理.md) で実施する

## 非ゴール

- 大規模な state 管理ライブラリの導入

## 注意

- 体感差が端末依存になりやすいので、実機で確認すること
