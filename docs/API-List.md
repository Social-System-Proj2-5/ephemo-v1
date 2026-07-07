# API一覧表案 / FastAPI想定

## 1. 前提

- REST API として設計する。
- リクエストとレスポンスは原則 JSON とする。
- ファイル送信は `multipart/form-data` とする。
- 認証は `Authorization: Bearer <token>` を利用する。
- フロントエンドから DB へ直接アクセスしない。
- 個人データベースの素材は `assets` で管理する。
- 素材種別は `text` と `image` のみとする。
- 動画素材、音声素材は扱わない。
- 作成済みエフェメラは `ephemeras` で管理する。
- スクラップブックは扱わない。
- エフェメラは交換ではなく、対面共有で他ユーザーへ渡す。
- 共有はオンラインでは行わず、対面確認を伴う共有のみとする。
- エフェメラは1つだけ存在し、共有成立時に所有者を共有先ユーザーへ移す。
- エフェメラは作成から7日後に期限切れとなり、自動削除対象になる。
- 有効期限内のエフェメラはPDFなどのファイルとしてエクスポートできる。

## 2. 共通仕様

### 共通URL

```txt
/api/v1
```

### 想定DB

| テーブル | 用途 |
| --- | --- |
| `users` | ユーザー情報 |
| `assets` | 個人データベース内の文字素材、画像素材 |
| `templates` | templateエフェメラ |
| `ephemeras` | 作成済みエフェメラ |
| `ephemera_asset_links` | エフェメラで使用した素材 |
| `share_sessions` | 対面共有の一時セッション |
| `share_records` | 成立または失敗した共有記録 |
| `export_records` | エフェメラのエクスポート記録 |

## 3. API一覧

### 3.1 認証・ユーザー系 API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 1 | ログイン | POST | `/api/v1/auth/login` | `email`, `password` | `access_token`, `user_id` | `users` を検索 |
| 2 | 新規登録 | POST | `/api/v1/auth/register` | `email`, `password`, `display_name` | `user_id`, `access_token` | `users` に追加 |
| 3 | 自分の情報取得 | GET | `/api/v1/users/me` | なし | `user_id`, `display_name`, `icon_url` | `users` を取得 |
| 4 | 表示名更新 | PATCH | `/api/v1/users/me` | `display_name`, `icon_asset_id` 任意 | 更新後のユーザー情報 | `users` を更新 |

### 3.2 素材管理 API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 5 | 素材一覧取得 | GET | `/api/v1/assets` | `type` 任意 | `assets[]` | 自分の文字素材、画像素材だけ取得 |
| 6 | 素材詳細取得 | GET | `/api/v1/assets/{asset_id}` | `asset_id` | 素材詳細 | `assets` を取得 |
| 7 | 文字素材作成 | POST | `/api/v1/assets/text` | `title`, `body` | `asset_id` | `assets.asset_type = text` として追加 |
| 8 | 画像素材アップロード | POST | `/api/v1/assets/image` | `file`, `title` | `asset_id`, `file_url`, `thumbnail_url` | `assets.asset_type = image` として追加 |
| 9 | 素材名変更 | PATCH | `/api/v1/assets/{asset_id}` | `title` | 更新後の素材情報 | `assets` を更新 |
| 10 | 素材削除 | DELETE | `/api/v1/assets/{asset_id}` | `asset_id` | 削除結果 | `assets` を論理削除 |

### 3.3 テンプレート API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 11 | テンプレート一覧取得 | GET | `/api/v1/templates` | `category` 任意 | `templates[]` | `templates` を取得 |
| 12 | テンプレート詳細取得 | GET | `/api/v1/templates/{template_id}` | `template_id` | テンプレート詳細 | `templates` を取得 |

### 3.4 エフェメラ API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 13 | エフェメラ一覧取得 | GET | `/api/v1/ephemeras` | `status` 任意 | `ephemeras[]` | 自分が所有する有効期限内の `ephemeras` を取得 |
| 14 | エフェメラ詳細取得 | GET | `/api/v1/ephemeras/{ephemera_id}` | `ephemera_id` | エフェメラ詳細、残り有効期間 | `ephemeras`, `ephemera_asset_links`, `assets` を取得 |
| 15 | エフェメラ作成 | POST | `/api/v1/ephemeras` | `template_id`, `title`, `asset_ids[]`, `content_values` | `ephemera_id`, `expires_at` | 作成から7日後を `expires_at` に保存 |
| 16 | エフェメラ削除 | DELETE | `/api/v1/ephemeras/{ephemera_id}` | `ephemera_id` | 削除結果 | 所有者確認後、`deleted_at` を更新 |

### 3.5 対面共有 API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 17 | 共有セッション作成 | POST | `/api/v1/shares/sessions` | `ephemera_id`, `verification_method` | `share_session_id`, `qr_payload`, `expires_at` | 所有者と有効期限を確認し、`share_sessions` に追加 |
| 18 | 共有セッション確認 | GET | `/api/v1/shares/sessions/{session_id}` | `session_id` | 共有元ユーザー、エフェメラプレビュー、期限 | `share_sessions`, `users`, `ephemeras` を取得 |
| 19 | 共有先参加 | POST | `/api/v1/shares/sessions/{session_id}/join` | `verification_payload` | 参加結果 | 対面確認後、`partner_user_id` を保存 |
| 20 | 共有確定 | POST | `/api/v1/shares/sessions/{session_id}/confirm` | `confirm: true` | 共有成立結果、現在所有者 | `ephemeras.owner_user_id` を共有先へ変更し、`share_records` に追加 |
| 21 | 共有キャンセル | POST | `/api/v1/shares/sessions/{session_id}/cancel` | `reason` 任意 | キャンセル結果 | `share_sessions` を更新 |

### 3.6 共有履歴 API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 22 | 共有履歴取得 | GET | `/api/v1/shares/history` | `limit`, `offset` 任意 | `share_records[]` | 自分に関係する `share_records` を取得 |
| 23 | 共有履歴詳細取得 | GET | `/api/v1/shares/history/{record_id}` | `record_id` | 共有詳細 | `share_records`, `ephemeras`, `users` を取得 |

### 3.7 エクスポート API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 24 | PDFエクスポート作成 | POST | `/api/v1/ephemeras/{ephemera_id}/exports` | `format: "pdf"` | `export_id`, `file_url` | 所有者と有効期限を確認し、PDF生成後 `export_records` に追加 |
| 25 | エクスポート履歴取得 | GET | `/api/v1/ephemeras/{ephemera_id}/exports` | `ephemera_id` | `export_records[]` | 自分のエクスポート履歴を取得 |

### 3.8 メンテナンス API / 内部処理

| No | 機能 | Method | URL | 実行主体 | 処理内容 |
| --: | --- | --- | --- | --- | --- |
| 26 | 期限切れエフェメラ削除 | 内部処理 | なし | スケジューラー | `expires_at < now()` のエフェメラを期限切れまたは削除済みにする |

## 4. 共有確定時のバックエンド処理

共有確定時は以下を同一トランザクションで処理する。

1. 共有セッションを取得してロックする。
2. セッションが有効期限内であることを確認する。
3. 共有元ユーザーと共有先ユーザーが同一でないことを確認する。
4. 共有対象エフェメラが存在することを確認する。
5. エフェメラが期限切れまたは削除済みでないことを確認する。
6. エフェメラの現在所有者が共有元ユーザーであることを確認する。
7. 対面確認が完了していることを確認する。
8. エフェメラを複製せず、`ephemeras.owner_user_id` を共有先ユーザーへ変更する。
9. `share_records` に共有元、共有先、エフェメラ、共有結果、対面確認方式を追加する。
10. `share_sessions` を `completed` に更新する。

## 5. エフェメラ期限管理

- エフェメラ作成時、`expires_at = created_at + interval '7 days'` とする。
- API は `expires_at > now()` かつ `deleted_at is null` のエフェメラだけを通常操作対象にする。
- 期限切れエフェメラは共有できない。
- 期限切れエフェメラはエクスポートできない。
- 期限切れエフェメラはスケジューラーで自動削除または期限切れ状態に更新する。

## 6. バリデーション

- `assets.asset_type` は `text` または `image` のみ許可する。
- エフェメラ作成時の `asset_ids[]` はすべて現在ユーザーの文字素材または画像素材であること。
- templateエフェメラ自体は共有対象にしない。
- 共有対象は有効期限内の作成済みエフェメラのみとする。
- 共有時にエフェメラをコピーしない。
- 共有後、元の所有者は対象エフェメラの詳細表示、共有、エクスポートを実行できない。
- オンライン共有や遠隔共有を示す共有種別は受け付けない。

## 7. MVP API 範囲

- 認証 API
- 文字素材登録、一覧、詳細 API
- 画像素材アップロード、一覧、詳細 API
- templateエフェメラ一覧、詳細 API
- エフェメラ作成、一覧、詳細 API
- 対面共有セッション作成、参加、確定 API
- 共有履歴 API
- PDFエクスポート API
- 期限切れエフェメラ自動削除処理
