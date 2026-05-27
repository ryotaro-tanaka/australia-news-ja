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
