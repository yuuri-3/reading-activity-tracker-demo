# P1-TK-013 TypeScript の `strict` を段階導入する

このチケットは、TypeScript の厳密さを段階的に上げ、将来の事故（undefined/null/型抜け）を早期検知できるようにします。

## ゴール

- `tsconfig.json` の厳密設定が方針化され、段階的に強化される
- 追加された厳密化による修正が、局所的・理解可能な形で入る

## 対象

- `tsconfig.json`
- 型エラーが出やすい箇所（導入時に判明する範囲）

## 実装状況

Status: ✅ 完了

## 受け入れ条件

- [x] `strict: true` を採用し、主要な厳密設定が **明示** されている（作業内容 3 に準拠）
- [x] 例外は許可しない方針で合意されている
- [x] 新規コードの最低限ガード基準が **基準 C（A+B）** として明文化されている
- [x] 導入した設定で `npm run typecheck` が通る

## 作業内容

### 1) 方式決め（方針）

- 採用: **案 A（いきなり `strict: true`）**
- ねらい: 今後の事故（`undefined` / `null` / 型抜け）を最短で抑止し、ルールを単純化する
- 影響: 修正量が大きくなる可能性は許容する（このタイミングでしっかり整備）

### 2) 最小差分で適用

- 影響が少ない設定から入れる
- 型ガード/`as const`/補助関数で修正を局所化

### 3) 設定の明示（運用ルール）

- 方針: `strict: true` に加えて、主要な厳密設定を **明示して記載** する
- 目的: 有効化される厳密性の意図を明文化し、将来の変更・レビューを容易にする
- 明示対象（例）:
  - `noImplicitAny`
  - `strictNullChecks`
  - `strictFunctionTypes`
  - `strictBindCallApply`
  - `strictPropertyInitialization`
  - `noImplicitThis`
  - `useUnknownInCatchVariables`
  - `alwaysStrict`
  - `noUncheckedIndexedAccess`
  - `exactOptionalPropertyTypes`

### 4) 例外の扱い

- 原則: **例外は許可しない**
- 例外が必要と判断された場合は、そのタイミングで別途方針を検討する

### 5) 最低限のガード基準（新規コード）

- 採用: **基準 C（A+B の両方）**
- A: `undefined` / `null` を扱う変数は型で明示し、利用時に必ずガードする
- B: 外部入力（API/Storage/URL/フォーム）由来は型ガード or バリデーションを必須とする

## 非ゴール

- すべてのコードを完璧にジェネリクス化する

## 注意

- `skipLibCheck` は維持でも良い（速度優先）。ただし不整合が見えにくくなる点は記録する
