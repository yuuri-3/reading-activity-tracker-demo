# P0-RE_001-TK_006 タイマー tick による広範囲再レンダーを抑制

このチケットは、100ms tick が `AppContext` を通じて広範囲の再レンダーを誘発し得る状態を改善し、体感性能と電池消費を安定させます。

## ゴール

- タイマー動作中も入力/スクロールが重くならない
- `useApp()` 購読範囲が無駄に揺れない

## 対象

- App state: [src/app/context/AppContext.tsx](../../../src/app/context/AppContext.tsx)
- タイマー表示を含むページ/コンポーネント（TimerPage/TimerSection 等）

## 実装状況

Status: ⬜ 未着手

## 受け入れ条件

達成チェック:

- [ ] tick 中に `AppContext.Provider` の value が不要に変化しない（Timer と無関係な UI が過剰に再レンダーしない）
- [ ] タイマー表示の更新頻度は要件を満たす（表示がカクつかない）
- [ ] 既存の永続化（localStorage）挙動が壊れない

## 作業内容

### 1) 方針決定

- 案 A: Timer 専用 Context に分離して購読範囲を限定
- 案 B: tick を 250ms〜1000ms に下げる（表示要件と相談）
- 案 C: Provider value の `useMemo` 安定化（最低限）

### 2) 実装

- 影響が小さい方針から段階的に適用

## 非ゴール

- 大規模な state 管理ライブラリの導入

## 注意

- 体感差が端末依存になりやすいので、実機で確認すること
