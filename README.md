# yakusoku-public

Notion のタスク管理データベースから、締切日・リスケ日をもとにタスクを抽出し、GitHub Actions 上でのバッチ実行を通じて LINE にプッシュ通知するためのリポジトリだんな😸

## このリポジトリの使い方

このリポジトリは公開用のテンプレートとして提供されているため、**デフォルトでは自動実行されない設定**になっている。
フォークして自分用に使う場合は、以下の手順に従って設定してくれ。

### ステップ1: リポジトリをフォーク

1. GitHub の右上にある「Fork」ボタンをクリックして、このリポジトリを自分のアカウントにフォークする。

### ステップ2: 設定ファイルの編集

1. フォークしたリポジトリで `src/config.ts` を開く。
2. `ENABLE_AUTO_RUN` の値を `false` から `true` に変更する。

```typescript
export const ENABLE_AUTO_RUN = true;
```

3. 通知時刻やメッセージなど、その他の設定も必要に応じて変更する。

### ステップ3: GitHub Actions の自動実行を有効化

1. `.github/workflows/notify-tasks.yml` を開く。
2. `schedule` のコメントを外して、自動実行を有効化する。

```yaml
on:
  schedule:
    - cron: "0 10 * * *" # 毎日 19:00 JST（UTC+9）
  workflow_dispatch:
```

### ステップ4: GitHub Secrets の設定

1. フォークしたリポジトリのページで「Settings」→「Secrets and variables」→「Actions」へ進む。
2. 「New repository secret」から以下の 4 つのシークレットを追加する。
   - `NOTION_API_KEY` - Notion Integration のトークン（取得方法は下記参照）
   - `NOTION_DATABASE_ID` - Notion データベースの ID（取得方法は下記参照）
   - `LINE_CHANNEL_ACCESS_TOKEN` - LINE Messaging API のチャネルアクセストークン（取得方法は下記参照）
   - `LINE_USER_ID` - 通知先の LINE ユーザー ID（取得方法は下記参照）

### ステップ5: 動作確認

1. 「Actions」タブを開く。
2. 左側の「Notify Notion Tasks to LINE」を選択。
3. 「Run workflow」ボタンから手動実行して、通知が正しく届くか確認する。

設定が完了すれば、毎日指定した時刻に自動で Notion のタスクが LINE に通知されるようになる。

---

## 要件定義

本リポジトリの詳細な仕様・前提条件・データフローは、以下の要件定義書にまとめてある。

- [要件定義書: Notionタスク LINE通知システム](./prompt/requirement.md)

README では、主にセットアップ手順とトークン取得方法、全体のシーケンスを説明する。

## 全体構成

- GitHub Actions のスケジュール実行で TypeScript スクリプトを起動
- Notion API からタスクを取得
- 締切日/リスケ日から通知対象タスクを抽出
- LINE Messaging API で指定ユーザーにプッシュ通知

## 通知タイミングの設定

- デフォルトでは、「本日」と「3日後」が通知対象日として扱われる。
- これらの通知タイミングとメッセージのラベルは、`src/config.ts` の `NOTIFICATION_CONFIG` および `NOTIFICATION_HEADER` を編集することで変更できる。
- 意図する通知時刻（JST）は、`src/config.ts` の `NOTIFICATION_TIME_JST` で管理する（デフォルトは `hour: 19, minute: 0`）。
- 実際に GitHub Actions がジョブを実行する時刻は、`.github/workflows/notify-tasks.yml` の `cron` 設定で決まるため、通知時刻を変える場合は `NOTIFICATION_TIME_JST` と `cron` の両方を揃える必要がある。

## シーケンス図（GitHub Actions ↔ Notion / LINE）

```text
GitHub Actions        Node.js Script        Notion API        LINE Messaging API        LINE User
      |                     |                   |                     |                    |
      | 1. Trigger (cron / 手動)                |                     |                    |
      |-------------------->|                   |                     |                    |
      |                     | 2. Notion にタスク問い合わせ           |                    |
      |                     |------------------>|                     |                    |
      |                     |                   | 3. タスク一覧レスポンス                |
      |                     |<------------------|                     |                    |
      |                     | 4. LINE にプッシュ通知リクエスト        |                    |
      |                     |---------------------------------------->|                    |
      |                     |                   |                     | 5. ユーザーへ通知  |
      |                     |                   |                     |------------------->|
      |                     |                   |                     |                    |
```

1. GitHub Actions が cron / 手動実行でワークフローを起動する。
2. Node.js スクリプトが環境変数（`NOTION_API_KEY`, `NOTION_DATABASE_ID`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_USER_ID`）を読み込む。
3. Node.js スクリプトが Notion API にタスクデータベースのクエリを送信する。
4. Notion API が条件に合致するタスク一覧を返す。
5. Node.js スクリプトが通知対象日の計算とタスクのフィルタリングを行う。
6. Node.js スクリプトが LINE Messaging API にプッシュメッセージ送信リクエストを送る。
7. LINE がユーザーの LINE アプリに通知を配信する。

## 必要なもの

- Node.js v20 系
- GitHub アカウント
- Notion アカウント
- LINE アカウント（LINE Messaging API 用）

---

## 1. Notion 側の設定

### 1-1. タスクデータベースの作成

Notion でデータベース専用ページを作成して、カラムを以下の通り設定する。

- 「タスク名」（テキスト型 / タイトル）
- 「締切日」（日付型）
- 「リスケ日」（日付型）
- 任意: 「遅延理由」（テキスト型） - 直接 Notion へ入力するためマストではない

![Notionデータベース設定例](./assets/notion_ex.png)

### 1-2. Notion Integration の作成と `NOTION_API_KEY` 取得手順

1. ブラウザで Notion にログインする。
2. [My integrations](https://www.notion.so/my-integrations) を開く。
3. 「+ New integration」から新しい Integration を作成。
   - 任意の名前（例: `yakusoku-notifier`）
   - ワークスペースを選択
   - 権限は *Read content* が含まれていることを確認
4. 作成後に表示される **Internal Integration Token** をコピーする。
5. これを `NOTION_API_KEY` として GitHub リポジトリの「Settings」→「Secrets and variables」→「Actions」に登録する（ローカルでテストしたい場合のみ `.env` にも設定する）。

### 1-3. データベースを Integration に共有する

1. 作成したタスクデータベースのページを開く。
2. 右上の「共有（Share）」ボタンをクリック。
3. 「Invite」から、さきほど作成した Integration を検索して追加し、少なくとも「Can read」権限を付与する。

### 1-4. `NOTION_DATABASE_ID` 取得手順

1. タスクデータベースのページをブラウザで開く。
2. 右上の「・・・」メニュー → 「Copy link」からページリンクをコピー。
3. クリップボードの URL を確認すると、次のような形式になっている。

   ```text
   https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
   ```

4. `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` の 32 文字（ハイフンが入ることもある）がデータベース ID。
5. ハイフンが含まれている場合はそのまま使ってよい。これを `NOTION_DATABASE_ID` として GitHub リポジトリの「Settings」→「Secrets and variables」→「Actions」に登録する（ローカルでテストしたい場合のみ `.env` にも設定する）。

---

## 2. LINE Messaging API 側の設定

### 2-1. Messaging API チャネルの作成

1. [LINE Developers コンソール](https://developers.line.biz/console/) にログイン。
2. Provider（プロバイダ）を作成、または既存の Provider を選択。
3. 「チャネルを作成」→ 「Messaging API」 を選択。
4. チャネル名や業種などを入力し、利用規約に同意して作成する。

### 2-2. `LINE_CHANNEL_ACCESS_TOKEN` 取得手順

1. 作成した Messaging API チャネルの設定画面を開く。
2. 左メニュー「Messaging API」を選択。
3. 「チャネルアクセストークン（長期）」の項目から「発行」ボタンを押す。
4. 表示されたトークンをコピーし、これを `LINE_CHANNEL_ACCESS_TOKEN` として GitHub リポジトリの「Settings」→「Secrets and variables」→「Actions」に登録する（ローカルでテストしたい場合のみ `.env` にも設定する）。

### 2-3. `LINE_USER_ID` 取得手順（自分宛てに通知する場合）

1. 同じ Messaging API チャネルの「Messaging API」設定画面で、QR コードを表示し、自分の LINE から友だち追加する。
2. 友だち追加後、しばらくするとチャネルの「友だち」タブに自分のアカウントが表示される。
3. 「Your user ID」などの表記で表示されている ID をコピーする。
4. これを `LINE_USER_ID` として GitHub リポジトリの「Settings」→「Secrets and variables」→「Actions」に登録する（ローカルでテストしたい場合のみ `.env` にも設定する）。

（環境や UI のアップデートにより表示場所が変わる可能性があるため、見つからない場合は公式ドキュメントも参照してくれ。）

---

## 3. 環境変数の設定

このリポジトリでは、以下の 4 つの環境変数を使用する。

```text
NOTION_API_KEY=
NOTION_DATABASE_ID=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_USER_ID=
```

通常の運用では、これらの値は GitHub リポジトリの「Settings」→「Secrets and variables」→「Actions」にのみ登録すればよく、`.env` への記入は不要だんな。ローカルでスクリプトを直接実行してテストしたい場合だけ、`.env` を使えばいい。

### 3-1. ローカル開発用 `.env`

1. `.env.sample` をコピーして `.env` を作成。
2. 上記 4 つの値をそれぞれ貼り付ける（ローカルで `npm start` などを実行して挙動を確認したい場合のみ設定すればよい）。

### 3-2. GitHub Actions Secrets

GitHub リポジトリの設定で、同じ名前の Secrets を登録する（基本的にはこちらだけ設定すれば十分だ）。

1. GitHub のリポジトリページを開く。
2. 「Settings」→ 「Secrets and variables」→ 「Actions」へ進む。
3. 「New repository secret」から以下を追加。
   - `NOTION_API_KEY`
   - `NOTION_DATABASE_ID`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_USER_ID`

これらは `.github/workflows/notify-tasks.yml` 内で参照され、GitHub Actions 上から Notion / LINE にアクセスするために使われる。

---

## 4. 実行方法

### 4-1. 依存パッケージのインストール

```bash
npm install
```

### 4-2. ビルド & ローカル実行

```bash
npm run build
npm start
```

### 4-3. GitHub Actions による定期実行

- `.github/workflows/notify-tasks.yml` に定義された cron に従って、毎日自動実行される。
- 手動実行を許可している場合は、GitHub Actions の画面から `Run workflow` でも動かせる。

---

## 5. 規約・プライバシーポリシーのサンプルについて

このリポジトリの `docs/terms-of-use.md`（利用規約）および `docs/privacy-policy.md`（プライバシーポリシー）は、どちらも **AI によって生成したサンプル文書** だ。LINE プラットフォームのプロバイダー設定で、利用規約やプライバシーポリシーの URL を提示するための「たたき台」として用意しているに過ぎず、**法的な正確性・完全性・適合性は一切保証しない**。  
そのまま利用するか、修正して利用するか、そもそも利用しないかは、**あなた自身の判断と自己責任** で決めてくれ。必要であれば、弁護士などの専門家に内容を確認してもらうことを強くおすすめするんな。  

これらの Markdown ファイルは、Cloudflare Pages などの静的ホスティングで公開して、LINE のプロバイダー設定用 URL として使うことを想定している。Cloudflare Pages を使う場合は、次のように設定すればよい：

- Git リポジトリとしてこのプロジェクトを接続する
- **Build command**: 空欄（ビルドなし）
- **Output directory**: `docs`

こうすることで、`docs` 配下の Markdown を静的ファイルとしてそのままホストできる。生成された URL を、LINE Developers 側の利用規約・プライバシーポリシーのリンクとして指定すればよい。  

## 6. 補足

- 詳細な仕様変更や拡張を行う場合は、まず [要件定義書](./prompt/requirement.md) を更新してから実装を変えると、「呪い」（技術的負債）を減らせるぞ。
- 不明点があれば、コードと要件定義を一緒に眺めながら読み解くといいんな。

## 7. ライセンス

- このリポジトリは MIT License のもとで公開されている。詳細はリポジトリ直下の `LICENSE` ファイルを参照してくれ。
- MIT License により、商用利用を含む広い形での利用・改変・再配布が可能だが、著作権表示およびライセンス文はソースコードや配布物から削除しないでくれ。
- 本リポジトリのコードを利用して構築されたサービスやプロダクトから第三者が利益を得た場合であっても、その結果について作者およびコントリビューターは一切の責任を負わない。
- また、本リポジトリのコードを含む成果物を、自らの完全なオリジナルであるかのように誤解させる形で利用・表示することは推奨されない。派生物を公開する場合は、元リポジトリへのクレジットをどこかに残しておくとよいんな。
