# API一覧表案 / FastAPI想定

## 1. 前提

- REST API として設計する。
- リクエストとレスポンスは原則 JSON とする。
- ファイル送信は `multipart/form-data` とする。
- 認証は `Authorization: Bearer <token>` を利用する。
- フロントエンドから DB へ直接アクセスしない。
- 素材は後端で保存せず、フロントエンド上で編集中のみ利用する。
- 編集中の素材種別は `text` と `image` のみとする。
- 動画素材、音声素材は扱わない。
- テンプレートはDBでは管理せず、サーバー上のローカルテンプレートファイルとして管理する。
- 完成したエフェメラはPDFまたは画像として生成された後に `ephemeras` で管理する。
- スクラップブックは扱わない。
- エフェメラは交換ではなく、対面共有で他ユーザーへ渡す。
- 共有はオンラインでは行わず、対面確認を伴う共有のみとする。
- エフェメラは1つだけ存在し、共有成立時に所有者を共有先ユーザーへ移す。
- エフェメラは作成から7日後に期限切れとなり、自動削除対象になる。
- 作成途中の素材や編集データは後端へ保存しない。

## 2. 共通仕様

### 共通URL

```txt
/api/v1
```

### 想定DB

| テーブル | 用途 |
| --- | --- |
| `users` | ユーザー情報 |
| `ephemeras` | PDFまたは画像として保存された作成済みエフェメラ |
| `share_records` | 成立または失敗した共有記録 |

### 想定ローカルファイル

| ファイル | 用途 |
| --- | --- |
| `server/templates/{template_key}.json` | templateエフェメラ定義 |

## 3. API一覧

### 3.1 認証・ユーザー系 API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 1 | ログイン | POST | `/api/v1/auth/login` | `email`, `password` | `access_token`, `user_id` | `users` を検索 |
| 2 | 新規登録 | POST | `/api/v1/auth/register` | `email`, `password`, `display_name` | `user_id`, `access_token` | `users` に追加 |
| 3 | 自分の情報取得 | GET | `/api/v1/users/me` | なし | `user_id`, `display_name`, `icon_url` | `users` を取得 |
| 4 | 表示名更新 | PATCH | `/api/v1/users/me` | `display_name`, `icon_url` 任意 | 更新後のユーザー情報 | `users` を更新 |

### 3.2 テンプレート API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 5 | テンプレート一覧取得 | GET | `/api/v1/templates` | `category` 任意 | `templates[]` | DBは使わず、サーバー上のローカルテンプレートファイルを読み取る |
| 6 | テンプレート詳細取得 | GET | `/api/v1/templates/{template_key}` | `template_key` | テンプレート詳細 | DBは使わず、該当するローカルテンプレートファイルを読み取る |

### 3.3 エフェメラ API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 7 | エフェメラ一覧取得 | GET | `/api/v1/ephemeras` | `status` 任意 | `ephemeras[]` | 自分が所有する有効期限内の `ephemeras` を取得 |
| 8 | エフェメラ詳細取得 | GET | `/api/v1/ephemeras/{ephemera_id}` | `ephemera_id` | エフェメラ詳細、残り有効期間、ファイルURL | `ephemeras` を取得 |
| 9 | 完成エフェメラ保存 | POST | `/api/v1/ephemeras` | `template_key`, `title`, `file`, `file_format` | `ephemera_id`, `file_url`, `expires_at` | 完成したPDFまたは画像を保存し、作成から7日後を `expires_at` に保存 |
| 10 | エフェメラ削除 | DELETE | `/api/v1/ephemeras/{ephemera_id}` | `ephemera_id` | 削除結果 | 所有者確認後、`deleted_at` を更新 |

### 3.4 対面共有 API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 11 | 対面共有確定 | POST | `/api/v1/shares/confirm` | `ephemera_id`, `to_user_id`, `verification_method`, `confirm: true` | 共有成立結果、現在所有者 | `ephemeras.owner_user_id` を共有先へ変更し、`share_records` に追加 |
| 12 | 共有キャンセル記録 | POST | `/api/v1/shares/cancel` | `ephemera_id`, `to_user_id` 任意, `reason` 任意 | キャンセル結果 | 必要に応じて `share_records` に不成立結果を追加 |

### 3.5 共有履歴 API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 13 | 共有履歴取得 | GET | `/api/v1/shares/history` | `limit`, `offset` 任意 | `share_records[]` | 自分に関係する `share_records` を取得 |
| 14 | 共有履歴詳細取得 | GET | `/api/v1/shares/history/{record_id}` | `record_id` | 共有詳細 | `share_records`, `ephemeras`, `users` を取得 |

### 3.6 メンテナンス API / 内部処理

| No | 機能 | Method | URL | 実行主体 | 処理内容 |
| --: | --- | --- | --- | --- | --- |
| 15 | 期限切れエフェメラ削除 | 内部処理 | なし | スケジューラー | `expires_at < now()` のエフェメラを期限切れまたは削除済みにする |

## 4. 共有確定時のバックエンド処理

共有確定時は以下を同一トランザクションで処理する。

1. 共有対象エフェメラを取得してロックする。
2. 共有元ユーザーと共有先ユーザーが同一でないことを確認する。
3. エフェメラが期限切れまたは削除済みでないことを確認する。
4. エフェメラの現在所有者が共有元ユーザーであることを確認する。
5. 対面確認が完了していることを確認する。
6. エフェメラを複製せず、`ephemeras.owner_user_id` を共有先ユーザーへ変更する。
7. `share_records` に共有元、共有先、エフェメラ、共有結果、対面確認方式を追加する。

## 5. エフェメラ期限管理

- エフェメラ作成時、`expires_at = created_at + interval '7 days'` とする。
- API は `expires_at > now()` かつ `deleted_at is null` のエフェメラだけを通常操作対象にする。
- 期限切れエフェメラは共有できない。
- 期限切れエフェメラは再保存、共有できない。
- 期限切れエフェメラはスケジューラーで自動削除または期限切れ状態に更新する。

## 6. バリデーション

- 後端は作成途中の素材を管理するAPIを提供しない。
- エフェメラ保存時の `file_format` は `pdf` または `image` のみ許可する。
- エフェメラ保存時は完成したファイルのみ受け付ける。
- テンプレートはローカルファイルから読み取り、DBには保存しない。
- templateエフェメラ自体は共有対象にしない。
- 共有対象は有効期限内の作成済みエフェメラのみとする。
- 共有時にエフェメラをコピーしない。
- 共有後、元の所有者は対象エフェメラの詳細表示、共有を実行できない。
- オンライン共有や遠隔共有を示す共有種別は受け付けない。

## 7. MVP API 範囲

- 認証 API
- ローカルテンプレートファイルの一覧、詳細 API
- 完成エフェメラ保存、一覧、詳細 API
- 対面共有確定 API
- 共有履歴 API
- 期限切れエフェメラ自動削除処理
