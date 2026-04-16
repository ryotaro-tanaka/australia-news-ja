# Project: 豪州ニュース (News for Japanese in Australia)

このプロジェクトでは、Cloudflare Pages と Workers AI を活用して、豪州在住日本人向けの無料ニュースサイトを構築します。

## 開発指針

### アーキテクチャ
- **React 責任分離モデル**: `docs/react-responsibility-separation.md` に記載された設計指針を遵守してください。
- **View/Container/State/Usecase** の分離を意識し、`App.tsx` が肥大化しないように適宜コンポーネントや Hook に抽出してください。

### 技術スタック
- **Frontend**: Vite + React (TypeScript)
- **Backend**: Cloudflare Pages Functions
- **AI**: Workers AI (`@cf/meta/m2m100-1.2b`) による自動翻訳
- **Styling**: Vanilla CSS (モバイルフレンドリー重視)

### 優先事項
1. **モバイルファースト**: スマートフォンでの読みやすさを最優先する。
2. **コスト効率**: 無料枠内での動作を基本とする（Cloudflare KV などの活用）。
3. **日本語体験**: 日本語訳の質と、原文との対比のしやすさを両立する。

## 命名規則
- APIエンドポイント: `/api/news`
- 翻訳データのプロパティ名: `*_ja` (例: `title_ja`)
