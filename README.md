# 南半球の朝ごはんニュース

![CI](https://github.com/ryotaro-tanaka/australia-news-ja/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/ryotaro-tanaka/australia-news-ja/actions/workflows/deploy.yml/badge.svg)

URL: https://news-ja.pages.dev/

## ターゲット

オーストラリア在住の日本人向け

## 情報源

以下のRSS:
- ABC News - Business: https://www.abc.net.au/news/feed/51892/rss.xml [sample-xml](./sample/abc-business.xml)
- ABC News - Politics: https://www.abc.net.au/news/feed/1042/rss.xml [sample-xml](./sample/abc-politics.xml)
<!-- - ABC News – Just In（総合）: https://www.abc.net.au/news/feed/51120/rss.xml ノイズが多いので不採用 -->

## 開発・運用スクリプト

| コマンド | 内容 |
| :--- | :--- |
| `npm run dev` | ローカル開発サーバー起動 |
| `npm run check` | 構文・ビルドチェック（プッシュ前に実行） |
| `npm run post` | 最新ニュースを要約して Threads に自動投稿 |
| `npm run post:raw` | 任意のメッセージを Threads に投稿 |
| `npm run deploy` | Cloudflare Pages へ手動デプロイ |
| `npm run build` | プロダクション用ビルド |

