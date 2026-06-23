# API一覧表案 / FastAPI想定

## 1. 前提

- REST API として設計する。
- リクエストとレスポンスは原則 JSON とする。
- ファイル送信は `multipart/form-data` とする。
- 認証は `Authorization: Bearer <token>` を利用する。
- フロントエンドから DB へ直接アクセスしない。
- 個人データベースの素材は `assets` で管理する。
- 作成済みエフェメラは `assets` の一種として扱い、詳細情報を `ephemeras` に保存する。
- templateエフェメラは交換対象にしない。
- 交換対象は個人データベース内の素材そのものではなく、スクラップブックに配置された `scrapbook_items` とする。
- 交換は `face_to_face`（対面交換）または `remote`（遠隔交換）のどちらかとして記録する。

## 2. 共通仕様

### 共通URL

```txt
/api/v1
```

### 想定DB

| テーブル | 用途 |
| --- | --- |
| `users` | ユーザー情報、保有ポイント |
| `assets` | 個人データベース内の素材 |
| `templates` | templateエフェメラ |
| `ephemeras` | 作成済みエフェメラ詳細 |
| `scrapbooks` | スクラップブック本体 |
| `scrapbook_items` | スクラップブック上の配置素材 |
| `ai_generations` | AI生成ジョブ |
| `exchange_sessions` | 交換中のセッション |
| `exchange_records` | 成立または失敗した交換記録 |
| `point_records` | ポイント増減履歴 |

## 3. API一覧

### 3.1 認証・ユーザー系 API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 1 | ログイン | POST | `/api/v1/auth/login` | `email`, `password` | `access_token`, `user_id` | `users` を検索 |
| 2 | 新規登録 | POST | `/api/v1/auth/register` | `email`, `password`, `display_name` | `user_id`, `access_token` | `users` に追加 |
| 3 | 自分の情報取得 | GET | `/api/v1/users/me` | なし | `user_id`, `display_name`, `point`, `icon_url` | `users` を取得 |
| 4 | 表示名更新 | PATCH | `/api/v1/users/me` | `display_name`, `icon_asset_id` | 更新後のユーザー情報 | `users` を更新 |
| 5 | 自分のポイント取得 | GET | `/api/v1/users/me/points` | なし | `current_point` | `point_records` を集計 |

### 3.2 素材管理 API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 6 | 素材一覧取得 | GET | `/api/v1/assets` | `type`, `include_source` 任意 | `assets[]` | `assets` から自分の素材だけ取得。必要に応じて `exchange_records` から取得元を判定 |
| 7 | 素材詳細取得 | GET | `/api/v1/assets/{asset_id}` | `asset_id` | 素材詳細、取得元判定情報 | `assets` を取得し、交換取得素材は `exchange_records` を参照 |
| 8 | 素材アップロード | POST | `/api/v1/assets` | `file`, `type`, `title` | `asset_id`, `file_url`, `thumbnail_url` | ファイル保存後、`assets` に追加 |
| 9 | 素材名変更 | PATCH | `/api/v1/assets/{asset_id}` | `title` | 更新後の素材情報 | `assets` を更新 |
| 10 | 素材削除 | DELETE | `/api/v1/assets/{asset_id}` | `asset_id` | 削除結果 | `assets` を論理削除 |

### 3.3 テンプレート API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 11 | テンプレート一覧取得 | GET | `/api/v1/templates` | `category` 任意 | `templates[]` | `templates` を取得 |
| 12 | テンプレート詳細取得 | GET | `/api/v1/templates/{template_id}` | `template_id` | テンプレート詳細 | `templates` を取得 |

### 3.4 AI作成 API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 13 | AI生成開始 | POST | `/api/v1/ai/generations` | `prompt`, `template_id`, `source_asset_ids[]` | `generation_id`, `status` | `ai_generations` に追加 |
| 14 | AI生成状態確認 | GET | `/api/v1/ai/generations/{generation_id}` | `generation_id` | `status`, `asset_id` | `ai_generations` を取得 |
| 15 | AI生成結果を素材化 | 内部処理 | なし | なし | なし | 生成完了後、`assets` に追加 |

### 3.5 エフェメラ API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 16 | エフェメラ一覧取得 | GET | `/api/v1/ephemeras` | `template_id` 任意 | `ephemeras[]` | `ephemeras` から自分の作成済みエフェメラを取得 |
| 17 | エフェメラ詳細取得 | GET | `/api/v1/ephemeras/{ephemera_id}` | `ephemera_id` | エフェメラ詳細 | `ephemeras` を取得 |
| 18 | エフェメラ作成 | POST | `/api/v1/ephemeras` | `template_id`, `title`, `input_values`, `asset_id` 任意 | `asset_id`, `ephemera_id` | `assets` に作成済みエフェメラ素材を追加し、`ephemeras` に入力内容を保存 |
| 19 | エフェメラ更新 | PATCH | `/api/v1/ephemeras/{ephemera_id}` | `title`, `input_values` | 更新後の情報 | `ephemeras` と対応する `assets` を更新 |
| 20 | エフェメラ削除 | DELETE | `/api/v1/ephemeras/{ephemera_id}` | `ephemera_id` | 削除結果 | `ephemeras` を論理削除 |

### 3.6 スクラップブック API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 21 | スクラップブック一覧取得 | GET | `/api/v1/scrapbooks` | なし | `scrapbooks[]` | `scrapbooks` を取得 |
| 22 | スクラップブック作成 | POST | `/api/v1/scrapbooks` | `title`, `background_id` | `scrapbook_id` | `scrapbooks` に追加 |
| 23 | スクラップブック詳細取得 | GET | `/api/v1/scrapbooks/{scrapbook_id}` | `scrapbook_id` | スクラップブック本体と配置情報 | `scrapbooks`, `scrapbook_items` を取得 |
| 24 | スクラップブック更新 | PATCH | `/api/v1/scrapbooks/{scrapbook_id}` | `title`, `background_id` | 更新後の情報 | `scrapbooks` を更新 |
| 25 | スクラップブック削除 | DELETE | `/api/v1/scrapbooks/{scrapbook_id}` | `scrapbook_id` | 削除結果 | `scrapbooks` を論理削除 |
| 26 | アイテム追加 | POST | `/api/v1/scrapbooks/{scrapbook_id}/items` | `asset_id`, `x`, `y`, `width`, `height`, `is_exchangeable` 任意 | `scrapbook_item_id` | `scrapbook_items` に追加。自分の `assets` に存在する素材のみ配置可能 |
| 27 | アイテム配置更新 | PATCH | `/api/v1/scrapbooks/{scrapbook_id}/items/{item_id}` | `x`, `y`, `width`, `height`, `rotation`, `is_exchangeable` 任意 | 更新後の配置 | `scrapbook_items` を更新 |
| 28 | アイテム削除 | DELETE | `/api/v1/scrapbooks/{scrapbook_id}/items/{item_id}` | `item_id` | 削除結果 | `scrapbook_items` を削除 |

### 3.7 交換 API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 29 | 交換セッション作成 | POST | `/api/v1/exchange/sessions` | `exchange_type`, `my_scrapbook_item_id` | `exchange_session_id`, `qr_payload`, `expires_at`, `required_point` | `exchange_sessions` に追加 |
| 30 | 交換セッション確認 | GET | `/api/v1/exchange/sessions/{session_id}` | `session_id` | 相手の表示名、交換対象素材プレビュー、交換種別、必要ポイント | `exchange_sessions`, `users`, `scrapbook_items`, `assets` を取得 |
| 31 | 交換に出す自分の素材選択 | PATCH | `/api/v1/exchange/sessions/{session_id}/offer` | `my_scrapbook_item_id` | 選択結果 | `exchange_sessions` を更新 |
| 32 | 交換確定 | POST | `/api/v1/exchange/sessions/{session_id}/confirm` | `confirm: true` | 交換成立結果、付与ポイント、消費ポイント、取得素材ID、特殊イベント結果 | `exchange_records`, `assets`, `point_records` に追加 |
| 33 | 交換キャンセル | POST | `/api/v1/exchange/sessions/{session_id}/cancel` | `reason` 任意 | キャンセル結果 | `exchange_sessions` を更新 |

### 3.8 履歴・ポイント API

| No | 機能 | Method | URL | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- |
| 34 | 交換履歴取得 | GET | `/api/v1/exchanges/history` | `limit`, `offset` 任意 | `exchange_records[]` | `exchange_records` を取得 |
| 35 | 交換履歴詳細取得 | GET | `/api/v1/exchanges/history/{record_id}` | `record_id` | 交換詳細 | `exchange_records`, `assets`, `users` を取得 |
| 36 | ポイント履歴取得 | GET | `/api/v1/points/history` | `limit`, `offset` 任意 | `point_records[]` | `point_records` を取得 |

## 4. 交換確定時のバックエンド処理

1. `exchange_sessions` を確認する。
2. セッションの有効期限を確認する。
3. 自分自身との交換でないか確認する。
4. 交換種別が `face_to_face` または `remote` であることを確認する。
5. 双方の `scrapbook_item_id` が存在し、各ユーザー本人のスクラップブックに配置されていることを確認する。
6. 双方の `scrapbook_items.asset_id` が存在することを確認する。
7. 対象素材が templateエフェメラではないことを確認する。
8. `scrapbook_items.is_exchangeable` が `true` であることを確認する。
9. `remote` の場合、必要ポイントを計算し、保有ポイント不足なら交換を成立させない。
10. Aさんの素材をBさん側の個人データベースへコピーする。
11. Bさんの素材をAさん側の個人データベースへコピーする。
12. `face_to_face` の場合はポイント付与、`remote` の場合はポイント消費を行う。
13. 必要に応じて特殊イベントを判定する。
14. `exchange_records` に交換種別、交換ユーザー、渡した素材、受け取った素材、成立結果、付与ポイント、消費ポイント、特殊イベント結果を追加する。
15. `point_records` にポイント付与または消費の履歴を追加する。
16. `exchange_sessions` を使用済みに更新する。

## 5. 優先して作るAPI

### 最優先

```txt
GET    /api/v1/users/me
POST   /api/v1/assets
GET    /api/v1/assets
GET    /api/v1/templates
POST   /api/v1/ephemeras
GET    /api/v1/ephemeras
POST   /api/v1/scrapbooks
POST   /api/v1/scrapbooks/{scrapbook_id}/items
POST   /api/v1/exchange/sessions
PATCH  /api/v1/exchange/sessions/{session_id}/offer
POST   /api/v1/exchange/sessions/{session_id}/confirm
GET    /api/v1/exchanges/history
```

### 後回しでもよい

```txt
POST   /api/v1/ai/generations
GET    /api/v1/ai/generations/{generation_id}
GET    /api/v1/points/history
確率ギミック系API
```

## 6. 確認したい点

### フロント担当

この URL とレスポンス形式で画面が作れるか。

### スクラップブック担当

配置情報は `x`, `y`, `width`, `height` で進めるか。  
それとも MVP では `slot_id` の固定枠方式にするか。

### AI作成担当

AI生成に必要な入力は `prompt`, `template_id`, `source_asset_ids[]` で足りるか。

### DB担当

このテーブル構成で保存できるか。  
`Asset` と `Ephemera` を分ける方針で問題ないか。  
交換対象は `scrapbook_items` 経由の `assets` とし、`ephemeras` は作成済みエフェメラの詳細テーブルとして扱う。
