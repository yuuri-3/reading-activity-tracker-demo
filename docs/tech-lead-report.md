# Yomzoy 技術レビュー（テックリード観点）

作成日: 2026-01-03

## 対象範囲

- フロントエンド: Vite + React (18)
- UI: Storybook, Tailwind, Radix, MUI（混在）
- データ: Firebase Auth + Firestore
- デプロイ: Firebase Hosting + GitHub Actions

※本レポートは「現状コードの設計/実装を読み、改善点を洗い出す」ことが目的です。
レポート以外のファイル修正は行っていません。

参照した主なファイル:

- package.json
- vite.config.ts
- tsconfig.json
- vitest.workspace.ts
- src/main.tsx
- src/app/App.tsx
- src/app/auth/AuthContext.tsx / src/app/auth/AuthGate.tsx
- src/app/context/AppContext.tsx
- src/app/firebase/firebase.ts
- firebase.json
- .github/workflows/deploy-firebase-hosting.yml
- README.md / DEPLOYMENT_PLAN.md / PROJECT_LOG.md

追加で確認したファイル（詳細分析用）:

- src/app/pages/TimerPage.tsx
- src/app/pages/BookCollectionView.tsx
- src/app/pages/BookSingleView.tsx
- src/app/pages/RecordSingleView.tsx
- src/app/pages/SanctumPage.tsx
- src/app/pages/TagManagementPage.tsx
- src/app/components/TimerSection.tsx
- src/app/components/Dialog.tsx
- src/app/components/ListCard.tsx
- src/app/components/Toast.tsx
- src/app/components/TagMultiSelectInput.tsx
- src/app/components/ui/select.tsx
- src/app/components/ui/dialog.tsx
- src/app/components/ui/utils.ts
- src/app/utils/format.ts
- src/app/utils/linkify.tsx
- src/app/types/index.ts
- src/styles/theme.css
- .storybook/main.ts / .storybook/vitest.setup.ts

---

## 現状の良い点（維持したい判断）

### 1) 「MVP として動く最小構成」が成立している

- SPA で完結し、Firebase Auth/Firestore を使う判断が一貫している
- Firestore は `onSnapshot` で single source of truth を採用しており、同期の筋が良い（`src/app/context/AppContext.tsx`）

### 2) iOS/モバイルのログイン不安定に対して実装が現実的

- `popup -> redirectフォールバック`、redirect ループ抑止、永続化（`browserLocalPersistence`）などが揃っている（`src/app/auth/AuthContext.tsx`）

### 3) Storybook と “Story ベースのテスト” の土台がある

- `vitest.workspace.ts` で `@storybook/experimental-addon-test/vitest-plugin` を使える状態
- UI の回帰を「テストとして固定化」しやすい

### 4) モバイル入力体験の配慮がある

- Dialog で日時入力の自動フォーカスを抑止し、端末によっては「開いた瞬間にネイティブピッカーが出る」事故を避けている（`src/app/components/Dialog.tsx`）
- VisualViewport を使ってキーボード表示時のズレを吸収している（`src/app/components/ui/dialog.tsx`）
- タグ入力で IME 確定 Enter と追加 Enter の干渉を避ける工夫がある（`src/app/components/TagMultiSelectInput.tsx`）

---

## 主要な課題（優先度順）

### P0: タイマーの tick が Context 経由で全体再レンダーを引き起こす（性能/電池）

現状:

- `AppContext` が `timerState` を持ち、`setInterval(100ms)` で `elapsedTime` を更新している（`src/app/context/AppContext.tsx`）
- `useApp()` を購読するコンポーネントが多く、100ms ごとに広範囲が再レンダーされやすい（ページ/リスト/フォームにも波及し得る）

リスク:

- 端末によってはスクロール/入力が重くなる（特に低スペック端末）
- バッテリー消費が増える
- 今は成立していても、機能追加で顕在化しやすい

推奨（追加依存なし）:

- Timer 専用の Context へ分離して購読範囲を限定
- もしくは tick を 250ms〜1000ms に下げ、表示側は要件に合わせて調整

### P0: 品質ゲート（test/typecheck/lint）が実運用に足りない

現状:

- `package.json` に `test` / `typecheck` / `lint` / `format` がない
- `vitest`/`playwright` が入っているのに「実行導線」がない（CI でも回っていない）
- GitHub Actions は build→deploy のみ（`.github/workflows/deploy-firebase-hosting.yml`）

リスク:

- 変更のたびに品質が目視依存になり、回帰が増える
- Storybook テストの資産が活かされない

推奨（最小の改善順）:

1. scripts 追加（新規パッケージ導入なし）
   - `test`: `vitest` を workspace で実行
   - `typecheck`: `tsc -p tsconfig.json --noEmit`
2. CI に「テスト + 型チェック」を追加（deploy 前に落とす）

※このレポートでは実装変更は行っていません（要望が“レポート作成”のため）。

---

### P0: README の手順が実態とズレている（`.env.example` 不在）

現状:

- README.md は「`.env.example` を参照」とあるが、リポジトリに存在しない

リスク:

- 新規参画者/別端末でのセットアップが詰まる
- 環境変数のキー名・必須/任意が共有されず事故る

推奨:

- `.env.example` を追加し、必須キー（VITE_FIREBASE_API_KEY など）と任意キーを明示
- README の該当手順も「Firebase Hosting/GitHub Actions Variables」へ整理

---

### P0: Firestore Rules がリポジトリに無い（運用が属人化しやすい）

現状:

- PROJECT_LOG.md には「`users/{uid}/**` のみ read/write」など方針はあるが、ルールファイル（例: `firestore.rules`）が同梱されていない

リスク:

- ルールを Firebase Console 手動で変更すると再現性が落ちる
- 誤設定でデータ漏えい/破壊の可能性（特に一般公開に寄せる将来）

推奨:

- `firestore.rules` と `firebase.json` の rules 参照を導入（または別管理方針を明記）
- 小規模共有が前提なら allowlist（メール/UID）を検討（DEPLOYMENT_PLAN.md と整合）

---

### P0: アカウント削除のデータ削除が不完全になり得る（残データ/運用事故）

現状:

- `deleteAccount()` が `users/{uid}/records` と `users/{uid}/books` を削除している（`src/app/auth/AuthContext.tsx`）
- ただし、`users/{uid}/tags` の削除が入っていない（=タグが残る可能性）
- 削除方式は「全件 get→batch delete」のため、データ件数が増えるほど負荷が増える（`deleteCollectionDocs`）

リスク:

- 「アカウント削除したのにタグ等が残る」など、ユーザー期待とズレる
- 将来データ量が増えると削除がタイムアウト/失敗しやすい（モバイル回線/低速環境）

推奨:

- 仕様として「何を消すか」を明文化し、実装も揃える（最低限 tags も対象に含める）
- データ量増加を見据えるなら、将来は Cloud Functions 等のサーバー側削除（recursive delete）も検討

※このレポートでは実装変更はしません。

---

### P1: アイコン方針と実装が矛盾している（依存/一貫性）

現状:

- lucide-react がページ/共通 UI に広範囲に混在（例: `src/app/pages/BookCollectionView.tsx`, `src/app/pages/RecordSingleView.tsx`, `src/app/components/TimerSection.tsx`, `src/app/components/ui/select.tsx` など）

リスク:

- 「アイコンは SVG からコンポーネント化する」方針とズレが生まれ、今後のデザイン差分対応がブレる
- アイコンのサイズ/線/見た目が統一されにくい

推奨:

- 方針をどちらかに寄せる（現状のリポジトリ指示だと「SVG コンポーネントへ寄せる」）
- まずは lucide の利用箇所を棚卸しし、`src/app/components/icons` 側に移行計画を作る

---

### P1: ルーティングが `App.tsx` に密集している

現状:

- Hash + state + effect で簡易実装（`src/app/App.tsx`）
- サブページも同一コンポーネントに閉じている（records/add, sanctum/tags）

リスク:

- ページ数増加で `App.tsx` が肥大化し、改修の衝突/バグが増える

推奨（最小）:

- ルート解析/生成を `src/app/utils/router.ts` 等に切り出し
- `parseHash()` と `buildHash()` にユニットテストを付ける（Vitest 活用）

※React Router 導入は将来選択肢。ただし「MVP 維持/追加依存最小」を優先するなら切り出しで十分。

---

### P1: `AppContext.tsx` が “DB アクセス + ドメインロジック + UI 状態” を抱え過ぎ

現状:

- Books/Records/Tags/Timer/Search を単一 Context で保持（`src/app/context/AppContext.tsx` は 500 行超）

リスク:

- 変更影響範囲が広く、保守性が落ちる
- レンダリングが不要に揺れやすい（Context value が大きい）

推奨（段階的）:

- ① Firestore 購読と CRUD を「データ層」に寄せる（例: `src/app/repositories/*`）
- ② Timer や Search 等の UI 寄り状態を別 Context に分割
- ③ Context の value は `useMemo` で安定化（関数が毎回生成される場合は要注意）

補足（今回の追加観察）:

- Record/Book 操作は `async` だが呼び出し側で await/エラーハンドリングが統一されていない箇所がある（例: `BookCollectionView` の登録処理）
- ID 生成方針が混在している（例: BookMemo は `Date.now()` ベース、タグは `crypto.randomUUID()` 併用）

---

### P1: Firestore のデータモデルが“伸びた時”に詰まりやすい設計になっている

現状:

- `createdAt` / `startTime` / `endTime` を ISO 文字列で扱っている（`src/app/types/index.ts` / `src/app/context/AppContext.tsx`）
  - 小規模では成立するが、タイムゾーン/整合性/クエリ要件が増えると苦しくなりやすい
- Books のメモが「Book ドキュメント内の配列」として増えていく（`addBookMemo` が `updateBook` で memos 配列を丸ごと更新）

リスク:

- メモが増えるほど Book ドキュメントが肥大化し、更新競合/読み込みコスト増につながる
- 作成日時の扱いが文字列だと、サーバータイムを基準にした整合性確保やクエリ/集計拡張がしにくい

推奨:

- “今は MVP”を前提にしつつ、伸びる可能性があるなら
  - BookMemo をサブコレクション化（`users/{uid}/books/{bookId}/memos`）
  - もしくは memo 件数に上限を設け、UI/仕様で割り切る
- 時刻は将来的に `serverTimestamp` / Firestore Timestamp を採用する余地を残す（移行方針をメモしておく）

---

### P1: UI の色・シャドウがトークンではなく直書きされている

現状:

- `src/styles/theme.css` にトークンはある一方、コンポーネント側で `text-[#5e84a6]` / `bg-[#e8edf2]` / `bg-[rgba(...)]` 等が散見される（例: `src/app/components/TimerSection.tsx`, `src/app/pages/RecordSingleView.tsx` など）

リスク:

- テーマ変更（ダークモード含む）や微調整で破綻しやすい
- “色の真実”が分散し、変更コストが上がる

推奨:

- 直書き色を `theme.css` の CSS 変数へ寄せて一元化する
- Tailwind 側でも `text-[var(--...)]` のように変数参照へ寄せる

補足（今回の追加観察）:

- `src/app/components/ui/button.tsx` / `src/app/components/ui/card.tsx` など “ui 基盤” に直書きが入っているため、影響範囲が大きい

---

### P1: TypeScript の厳密さが弱め（将来の事故が増えやすい）

現状:

- `tsconfig.json` に `strict` 系設定が見当たらない（=デフォルトは弱め）
- `skipLibCheck: true`（速度優先では良いが、不整合が見えにくい）

推奨:

- まず `noUncheckedIndexedAccess` などは後回しで OK
- `strict: true` を目標に、段階的に上げる（新規ファイルから適用など）

---

### P2: UI ライブラリ/依存が多く、整理余地がある

観察:

- Radix 系多数 + MUI + Emotion + Tailwind + shadcn 由来コンポーネント（ATTRIBUTIONS.md）

リスク:

- バンドル増、スタイル規約が混ざり、開発体験が割れる

推奨:

- まず「採用の優先順位」を短い文書で決める（例: 基本は Tailwind+Radix、MUI は既存のみ、など）
- 未使用依存の棚卸し（例: lucide-react 等、プロジェクト方針と合わないなら削除検討）

追加観察（運用コストの観点）:

- `src/app/components/ui` に非常に多くのコンポーネントが存在し（accordion/menubar/calendar/sidebar など）、現状の画面で未使用のものも含まれている可能性が高い
- 未使用でも「保守対象」になりがちなので、方針として
  - “使うものだけ置く”
  - “shadcn 由来は vendor として固定し、更新しない”
    などを決めると中長期の摩耗が減る

#### 追加: components/ui の使用状況（機械的棚卸し）

方法:

- `src/**` を対象に、`components/ui/<module>` の import 参照と、`src/app/components/ui` 内の相対 import（`./<module>`）を検索して分類
- 注意: 文字列検索ベースのため、将来の動的 import や生成コードがある場合は取りこぼす可能性あり

結果（2026-01-03 時点）:

- アプリ側から直接使われている（=ページ/コンポーネントから import されている）: 3
  - input（例: src/app/pages/BookCollectionView.tsx）
  - select（例: src/app/pages/TimerPage.tsx, src/app/pages/RecordSingleView.tsx）
  - use-mobile（例: src/app/pages/RecordSingleView.tsx）
- ui 内でのみ参照されている（=ui 群の“基盤”として使われている）: 9
  - button, dialog, label, separator, sheet, skeleton, toggle, tooltip, utils
- 参照が見つからなかった（現状、どこからも import されていない可能性が高い）: 35
  - accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, drawer, dropdown-menu, form, hover-card, input-otp, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, sidebar, slider, switch, table, tabs, textarea, toggle-group

示唆:

- 現状の画面規模に対して ui モジュールが多く、将来のアップデート/整合性確認コストが上がりやすい
- 削る場合は「未参照 35 + それが依存している基盤(9)」をまとめて候補化すると現実的

---

## すぐ効く改善（1 日以内の現実的 ToDo）

- `docs/` とは別に、以下を最小追加するのが費用対効果が高い
  - `package.json` scripts: `test`, `typecheck`
  - CI: deploy 前に `npm run test` / `npm run typecheck`
  - `.env.example` の追加
  - Firestore Rules をリポジトリで管理する方針決め

追加（影響が大きく、早めにやる価値が高い）:

- タイマー更新の購読範囲を限定（TimerContext 分離 or tick 間隔見直し）
- lucide-react の扱い（禁止なら移行、許可なら方針/例外を文書化）
- 直書きカラーの整理（トークン寄せ）

---

## 中長期（プロダクト化を見据えた提案）

- データ層（Firestore）を “Repository/Service” に寄せ、UI/ドメインから分離
- 画面数が増えたらルーティングをモジュール化（必要ならルータ導入）
- staging/prod 環境分離（DEPLOYMENT_PLAN.md の Step 3）

追加（中長期の設計改善案）:

- 肥大化ファイルの分割: `src/app/pages/RecordSingleView.tsx` は検索/集計/モバイル UI/CRUD が同居しており、変更衝突やバグ混入の温床になりやすい
- エラーハンドリングの統一: 現状は `toast` / state / `console.error` が混在するため、UX とログの方針を決めて揃える

---

## 付記: セキュリティの前提整理

- `VITE_FIREBASE_*` はフロントに埋め込まれるため秘匿情報ではない（キー制限・Rules が本丸）
- 守るべきものは Firestore Rules と認可設計（allowlist 等）
