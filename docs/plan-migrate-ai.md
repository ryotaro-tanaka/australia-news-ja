# Cloudflare Workers AI への移行およびインドネシア語削除プラン

## 目的
- Google翻訳APIを廃止し、Cloudflare Workers AI (Llama 3 8B) に切り替える。
- インドネシア語（id）対応をバックエンド・フロントエンドから完全に削除する。

## 実装ステップ

### ステップ1: バックエンド設定と型定義の修正
- `wrangler.toml` に `ai = { binding = "AI" }` を追加。
- `functions/api/news.ts` の `Env` インターフェースに `AI: any` を追加。
- `src/types/news.ts` から `title_id`, `firstLine_id` を削除。

### ステップ2: バックエンドロジックの AI 移行とインドネシア語削除
- `functions/api/news.ts` の `translateText` を `env.AI.run()` を使うように書き換え（Llama 3 8B を使用）。
- `functions/api/news.ts` 内の KV ルックアップ、翻訳、レスポンス生成からインドネシア語関連の処理をすべて削除。

### ステップ3: フロントエンドの状態管理の修正
- `src/state/NewsContext.tsx` から `id` 言語設定を削除し、デフォルトを `ja` に固定。
- `src/App.tsx` の `useEffect` 内にあるインドネシア語向けのタイトル・メタデータ設定を削除。

### ステップ4: UIコンポーネントのクリーンアップ
- `src/components/news/NewsCard.tsx` からインドネシア語の分岐とフォールバックを削除。
- `src/components/news/NewsList.tsx` からインドネシア語のメッセージとサンプルデータを削除。

## 検証
- `wrangler pages dev` で API が AI を通じて日本語翻訳を返すことを確認。
- ブラウザで表示が日本語のみになり、エラーが出ないことを確認。



# Cloudflare Workers AI への移行およびインドネシア語削除：実施記録

## 概要
Google翻訳APIを廃止し、Cloudflare Workers AI (Llama 3 8B Instruct) への移行を完了しました。また、プロジェクトのスコープを日本語に特化させるため、インドネシア語（id）に関連するすべての機能とロジックを削除しました。

## 実施内容

### 1. バックエンド (Cloudflare Pages Functions)
- **AI 移行**: `functions/api/news.ts` の翻訳エンジンを Google 翻訳から Cloudflare Workers AI (`@cf/meta/llama-3-8b-instruct`) に変更。
- **プロンプト最適化**: 翻訳精度向上のため、解説や注釈を排除し、自然な日本語のみを出力するようプロンプトを厳格化。
- **KV キャッシュ最適化**: インドネシア語のキャッシュ処理を削除し、日本語翻訳データのみを保存するように変更。
- **型安全性の向上**: `Env` インターフェースに `Ai` 型を定義し、Lint エラーを解消。

### 2. フロントエンド (React)
- **状態管理の簡素化**: `NewsContext.tsx` から言語切り替えロジックを削除。内部状態を日本語（`ja`）固定に変更。
- **UI コンポーネントのクリーンアップ**:
  - `NewsCard.tsx`, `NewsList.tsx` からインドネシア語用の条件分岐、フォールバック、エラーメッセージを削除。
  - 広告データ（Wise等）からインドネシア語版を削除。
- **メタデータ管理**: `App.tsx` の `useEffect` を整理し、日本語のタイトルとメタ記述のみを設定するように変更。

### 3. ルーティングとSEO
- **パスの整理**: 物理的な `id` ディレクトリが存在しないことを確認。
- **ルーティングの統一**: `/id` へのアクセスも SPA のデフォルト動作（日本語トップページ表示）に統一。

### 4. 運用スクリプト
- **投稿自動化**: `scripts/post-latest-news.ts` から、インドネシア語の要約生成および Threads への投稿ロジックを完全に削除。

## 結果
- **品質向上**: Llama 3 8B により、直訳ではない「ニュースらしい」自然な日本語翻訳が実現。
- **効率化**: API レスポンスから不要なフィールドが削除され、KV ストレージの使用量も削減。
- **保守性向上**: 複雑な多言語条件分岐が排除され、コードベースがシンプルに整理。

## 完了日
2026年5月27日
