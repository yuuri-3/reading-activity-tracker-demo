# Reading Activity Tracker v3

This is a code bundle for Reading Activity Tracker v3. The original project is available at https://www.figma.com/design/vUJNw84ODX81ThpaFig1Sz/Reading-Activity-Tracker-v3.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Firebase

このアプリは Firebase（Googleログイン + Firestore）を使います。

- 必要な設定値（`VITE_FIREBASE_*`）は `.env.example` を参照してください。
- GitHub Pages で動かす場合は、GitHub の Actions Variables に同じ `VITE_FIREBASE_*` を登録します。
