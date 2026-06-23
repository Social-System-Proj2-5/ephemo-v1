# Database Design / 個人データベース・スクラップブック素材交換

## 1. 設計方針

- 個人データベース内の素材は `assets` で管理する。
- 作成済みエフェメラは `assets` の一種として扱い、入力内容などの詳細を `ephemeras` に保存する。
- templateエフェメラは `templates` で管理し、交換対象にはしない。
- スクラップブックに配置された素材は `scrapbook_items` で管理する。
- 交換対象は `assets` そのものではなく、スクラップブックに配置された `scrapbook_items` とする。
- 他ユーザーから取得した素材の取得元は `assets` に直接保存せず、`exchange_records` を参照して判定する。
- 交換成立時は、素材コピー、交換記録、ポイント増減を同一トランザクションで処理する。
- 削除は原則として論理削除とし、交換記録は削除しない、または通常操作では削除できない設計にする。

## 2. ER概要

```txt
users
  ├─ assets
  │    └─ ephemeras
  ├─ scrapbooks
  │    └─ scrapbook_items ── assets
  ├─ exchange_sessions
  ├─ exchange_records
  └─ point_records

templates ── ephemeras
ai_generations ── assets
```

## 3. テーブル一覧

| テーブル | 役割 |
| --- | --- |
| `users` | ユーザー情報、保有ポイント |
| `assets` | 個人データベース内の素材 |
| `templates` | templateエフェメラ |
| `ephemeras` | 作成済みエフェメラ詳細 |
| `scrapbooks` | スクラップブック本体 |
| `scrapbook_items` | スクラップブック上の配置素材 |
| `ai_generations` | AI生成ジョブ |
| `exchange_sessions` | 交換開始から確定前までの状態 |
| `exchange_records` | 交換結果の保存、取得元判定の根拠 |
| `point_records` | ポイント付与・消費履歴 |

## 4. Enum定義

### asset_type

| 値 | 意味 |
| --- | --- |
| `ai_generated` | AI作り素材 |
| `video` | 動画 |
| `photo` | 写真 |
| `audio` | 音声 |
| `ephemera` | 作成済みエフェメラ |

### exchange_type

| 値 | 意味 |
| --- | --- |
| `face_to_face` | 対面交換 |
| `remote` | 遠隔交換 |

### exchange_status

| 値 | 意味 |
| --- | --- |
| `pending` | 交換セッション作成済み |
| `confirmed` | 片方または両方が承認中 |
| `completed` | 交換成立 |
| `cancelled` | キャンセル |
| `failed` | ポイント不足などで不成立 |
| `expired` | 有効期限切れ |

### point_record_type

| 値 | 意味 |
| --- | --- |
| `grant` | ポイント付与 |
| `consume` | ポイント消費 |
| `adjustment` | 管理・補正 |

## 5. テーブル定義

### 5.1 users

ユーザー情報と現在の保有ポイントを管理する。

| カラム | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| `id` | uuid | NO | ユーザーID |
| `email` | text | NO | ログイン用メールアドレス |
| `password_hash` | text | NO | パスワードハッシュ |
| `display_name` | text | NO | 表示名 |
| `icon_asset_id` | uuid | YES | アイコンに使う素材ID |
| `point_balance` | integer | NO | 現在の保有ポイント |
| `created_at` | timestamptz | NO | 作成日時 |
| `updated_at` | timestamptz | NO | 更新日時 |
| `deleted_at` | timestamptz | YES | 論理削除日時 |

主な制約:

- `email` は一意。
- `point_balance >= 0`。
- `icon_asset_id` は `assets.id` を参照する。ただし実装上は循環参照を避けるため nullable とする。

### 5.2 assets

個人データベース内の素材を管理する。写真、動画、音声、AI生成素材、作成済みエフェメラをすべてここに保存する。

| カラム | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| `id` | uuid | NO | 素材ID |
| `owner_user_id` | uuid | NO | 現在の所有者ユーザーID |
| `creator_user_id` | uuid | NO | 最初の作成者ユーザーID |
| `title` | text | NO | 素材名 |
| `asset_type` | asset_type | NO | 素材種別 |
| `file_url` | text | YES | 素材本体または保存先URL |
| `thumbnail_url` | text | YES | サムネイルURL |
| `metadata` | jsonb | NO | 表示情報、サイズ、再生時間など |
| `rarity` | text | YES | レア属性または特殊状態 |
| `is_from_template` | boolean | NO | templateエフェメラ由来かどうか |
| `source_asset_id` | uuid | YES | コピー元素材ID |
| `created_at` | timestamptz | NO | 作成日時 |
| `saved_at` | timestamptz | NO | 個人データベースへ保存された日時 |
| `updated_at` | timestamptz | NO | 更新日時 |
| `deleted_at` | timestamptz | YES | 論理削除日時 |

主な制約:

- `owner_user_id` と `creator_user_id` は `users.id` を参照する。
- `source_asset_id` はコピー元の `assets.id` を参照する。
- 取得元ユーザーIDは保存しない。取得元は `exchange_records` から判定する。
- `asset_type = 'ephemera'` の場合、原則として対応する `ephemeras.asset_id` を持つ。

### 5.3 templates

templateエフェメラを管理する。template自体は交換対象にしない。

| カラム | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| `id` | uuid | NO | templateエフェメラID |
| `name` | text | NO | テンプレート名 |
| `category` | text | YES | カテゴリ |
| `input_schema` | jsonb | NO | 入力可能項目 |
| `design_data` | jsonb | NO | テンプレートデザイン |
| `preview_url` | text | YES | プレビュー画像URL |
| `created_at` | timestamptz | NO | 作成日時 |
| `updated_at` | timestamptz | NO | 更新日時 |
| `deleted_at` | timestamptz | YES | 論理削除日時 |

主な制約:

- `input_schema` は、ユーザーが入力できる文字項目などを定義する。
- `templates` のレコードは `scrapbook_items.asset_id` として直接配置しない。

### 5.4 ephemeras

templateから生成された作成済みエフェメラの詳細を管理する。

| カラム | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| `id` | uuid | NO | 作成済みエフェメラID |
| `asset_id` | uuid | NO | 対応する素材ID |
| `template_id` | uuid | NO | 利用したtemplate ID |
| `input_values` | jsonb | NO | ユーザーが入力した文字など |
| `rendered_url` | text | YES | 生成後プレビューまたは画像URL |
| `created_at` | timestamptz | NO | 作成日時 |
| `updated_at` | timestamptz | NO | 更新日時 |
| `deleted_at` | timestamptz | YES | 論理削除日時 |

主な制約:

- `asset_id` は `assets.id` を参照し、一意とする。
- `template_id` は `templates.id` を参照する。
- `assets.asset_type = 'ephemera'` の素材だけを参照する。

### 5.5 scrapbooks

ユーザーごとのスクラップブック本体を管理する。

| カラム | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| `id` | uuid | NO | スクラップブックID |
| `owner_user_id` | uuid | NO | 所有者ユーザーID |
| `title` | text | NO | タイトル |
| `background_asset_id` | uuid | YES | 背景素材ID |
| `created_at` | timestamptz | NO | 作成日時 |
| `updated_at` | timestamptz | NO | 更新日時 |
| `deleted_at` | timestamptz | YES | 論理削除日時 |

主な制約:

- `owner_user_id` は `users.id` を参照する。
- スクラップブック自体は交換対象にしない。

### 5.6 scrapbook_items

スクラップブック上に配置された素材を管理する。交換対象はこのテーブルのレコードである。

| カラム | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| `id` | uuid | NO | スクラップブックアイテムID |
| `scrapbook_id` | uuid | NO | 所属スクラップブックID |
| `asset_id` | uuid | NO | 配置素材ID |
| `x` | numeric | NO | X座標 |
| `y` | numeric | NO | Y座標 |
| `width` | numeric | NO | 幅 |
| `height` | numeric | NO | 高さ |
| `rotation` | numeric | NO | 回転角度 |
| `z_index` | integer | NO | 重なり順 |
| `is_exchangeable` | boolean | NO | 交換候補にできるか |
| `created_at` | timestamptz | NO | 作成日時 |
| `updated_at` | timestamptz | NO | 更新日時 |
| `deleted_at` | timestamptz | YES | 論理削除日時 |

主な制約:

- `scrapbook_id` は `scrapbooks.id` を参照する。
- `asset_id` は `assets.id` を参照する。
- `asset_id` の `owner_user_id` は、`scrapbooks.owner_user_id` と一致する必要がある。
- templateエフェメラは `assets` ではないため配置対象にしない。

### 5.7 ai_generations

AI生成処理の状態を管理する。

| カラム | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| `id` | uuid | NO | AI生成ジョブID |
| `user_id` | uuid | NO | 実行ユーザーID |
| `prompt` | text | NO | 入力プロンプト |
| `template_id` | uuid | YES | 利用template ID |
| `source_asset_ids` | uuid[] | YES | 参照素材ID一覧 |
| `status` | text | NO | `queued`, `running`, `completed`, `failed` など |
| `result_asset_id` | uuid | YES | 生成後に作成された素材ID |
| `error_message` | text | YES | エラー内容 |
| `created_at` | timestamptz | NO | 作成日時 |
| `updated_at` | timestamptz | NO | 更新日時 |

主な制約:

- `user_id` は `users.id` を参照する。
- `result_asset_id` は `assets.id` を参照する。

### 5.8 exchange_sessions

交換開始から確定前までの一時状態を管理する。

| カラム | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| `id` | uuid | NO | 交換セッションID |
| `exchange_type` | exchange_type | NO | 対面交換または遠隔交換 |
| `status` | exchange_status | NO | セッション状態 |
| `initiator_user_id` | uuid | NO | 交換開始ユーザー |
| `partner_user_id` | uuid | YES | 交換相手ユーザー |
| `initiator_scrapbook_item_id` | uuid | NO | 開始ユーザーが出す配置素材 |
| `partner_scrapbook_item_id` | uuid | YES | 相手が出す配置素材 |
| `required_point` | integer | NO | 遠隔交換に必要なポイント |
| `qr_payload` | text | YES | 対面交換用QRなど |
| `expires_at` | timestamptz | NO | 有効期限 |
| `confirmed_by_initiator_at` | timestamptz | YES | 開始ユーザー承認日時 |
| `confirmed_by_partner_at` | timestamptz | YES | 相手ユーザー承認日時 |
| `created_at` | timestamptz | NO | 作成日時 |
| `updated_at` | timestamptz | NO | 更新日時 |

主な制約:

- `initiator_user_id` と `partner_user_id` は同一にしない。
- `remote` の場合は `required_point > 0`。
- `face_to_face` の場合は `required_point = 0` を基本とする。
- 交換確定時に、双方の `scrapbook_item_id` が有効で `is_exchangeable = true` であることを確認する。

### 5.9 exchange_records

成立・不成立を含む交換結果を保存する。取得元判定の根拠データになるため、通常操作では削除しない。

| カラム | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| `id` | uuid | NO | 交換記録ID |
| `exchange_session_id` | uuid | YES | 元の交換セッションID |
| `exchange_type` | exchange_type | NO | 対面交換または遠隔交換 |
| `status` | exchange_status | NO | 成立結果 |
| `user_a_id` | uuid | NO | ユーザーA |
| `user_b_id` | uuid | NO | ユーザーB |
| `user_a_offered_asset_id` | uuid | NO | Aが渡した元素材ID |
| `user_b_offered_asset_id` | uuid | NO | Bが渡した元素材ID |
| `user_a_received_asset_id` | uuid | YES | Aが受け取ったコピー素材ID |
| `user_b_received_asset_id` | uuid | YES | Bが受け取ったコピー素材ID |
| `user_a_offered_scrapbook_item_id` | uuid | NO | Aが選択した配置素材ID |
| `user_b_offered_scrapbook_item_id` | uuid | NO | Bが選択した配置素材ID |
| `granted_point` | integer | NO | 対面交換で付与したポイント |
| `consumed_point` | integer | NO | 遠隔交換で消費したポイント |
| `special_event_occurred` | boolean | NO | 特殊イベント発生有無 |
| `special_event_type` | text | YES | 特殊イベント種別 |
| `special_event_payload` | jsonb | NO | 特殊イベント詳細 |
| `failure_reason` | text | YES | 不成立理由 |
| `exchanged_at` | timestamptz | NO | 交換日時 |
| `created_at` | timestamptz | NO | 作成日時 |

主な制約:

- `user_a_id` と `user_b_id` は同一にしない。
- `completed` の場合、`user_a_received_asset_id` と `user_b_received_asset_id` は必須。
- `face_to_face` の場合、`granted_point >= 0`、`consumed_point = 0` を基本とする。
- `remote` の場合、`consumed_point >= 0`、`granted_point = 0` を基本とする。
- 取得元は `received_asset_id` と `offered_asset_id` の対応から判定する。

### 5.10 point_records

ポイントの増減履歴を管理する。

| カラム | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| `id` | uuid | NO | ポイント履歴ID |
| `user_id` | uuid | NO | 対象ユーザーID |
| `exchange_record_id` | uuid | YES | 関連交換記録ID |
| `record_type` | point_record_type | NO | 付与、消費、補正 |
| `amount` | integer | NO | 増減ポイント数。付与は正、消費は負 |
| `balance_after` | integer | NO | 反映後ポイント残高 |
| `reason` | text | NO | 増減理由 |
| `created_at` | timestamptz | NO | 作成日時 |

主な制約:

- `user_id` は `users.id` を参照する。
- `exchange_record_id` は `exchange_records.id` を参照する。
- `balance_after >= 0`。
- 遠隔交換の消費は、残高不足なら `point_records` を作成せず交換を不成立にする。

## 6. 取得元判定

素材データには取得元ユーザーIDを直接保存しない。取得元は `exchange_records` から判定する。

判定例:

1. ユーザーが `assets.id = X` の素材詳細を開く。
2. `exchange_records` から `user_a_received_asset_id = X` または `user_b_received_asset_id = X` の記録を探す。
3. `user_a_received_asset_id = X` の場合、取得元は `user_b_id`。
4. `user_b_received_asset_id = X` の場合、取得元は `user_a_id`。
5. 該当する交換記録がない場合、自作素材またはアップロード素材として扱う。

## 7. 交換成立時のトランザクション

交換確定処理は単一トランザクションで行う。

1. `exchange_sessions` を行ロックして取得する。
2. セッション期限、交換種別、承認状態を確認する。
3. 双方の `scrapbook_items` と `assets` を確認する。
4. templateエフェメラが交換対象になっていないことを確認する。
5. `remote` の場合、必要ポイントと残高を確認する。
6. Aの素材をBの `assets` としてコピーする。
7. Bの素材をAの `assets` としてコピーする。
8. 必要に応じて `ephemeras` の詳細もコピーする。
9. ポイント付与または消費を `users.point_balance` に反映する。
10. `exchange_records` を作成する。
11. `point_records` を作成する。
12. `exchange_sessions.status` を `completed` に更新する。

失敗時:

- ポイント不足の場合は `exchange_records.status = 'failed'` として保存できる。
- 素材コピー、ポイント増減、成立記録の一部だけが残らないようにロールバックする。

## 8. 推奨インデックス

| テーブル | インデックス | 目的 |
| --- | --- | --- |
| `assets` | `(owner_user_id, deleted_at)` | 自分の素材一覧 |
| `assets` | `(asset_type)` | 素材種別フィルタ |
| `ephemeras` | `(asset_id)` unique | assetsとの1対1対応 |
| `scrapbooks` | `(owner_user_id, deleted_at)` | 自分のスクラップブック一覧 |
| `scrapbook_items` | `(scrapbook_id, deleted_at)` | スクラップブック詳細 |
| `scrapbook_items` | `(asset_id)` | 素材が配置されている場所の確認 |
| `exchange_sessions` | `(initiator_user_id, status)` | 自分の交換セッション |
| `exchange_sessions` | `(expires_at)` | 期限切れ処理 |
| `exchange_records` | `(user_a_id, exchanged_at)` | ユーザー別交換履歴 |
| `exchange_records` | `(user_b_id, exchanged_at)` | ユーザー別交換履歴 |
| `exchange_records` | `(user_a_received_asset_id)` | 取得元判定 |
| `exchange_records` | `(user_b_received_asset_id)` | 取得元判定 |
| `point_records` | `(user_id, created_at)` | ポイント履歴 |

## 9. MVPで必須の範囲

MVPで必須:

- `users`
- `assets`
- `templates`
- `ephemeras`
- `scrapbooks`
- `scrapbook_items`
- `exchange_sessions`
- `exchange_records`
- `point_records`

MVPでは簡略化してよい:

- `ai_generations` はAI機能を後回しにする場合、後続実装でもよい。
- 特殊イベントは `special_event_occurred = false`、`special_event_payload = {}` を基本値として保存し、詳細演出は後回しにできる。
- ポイント計算は固定値から開始し、後で素材種別やイベントに応じた計算へ拡張する。

## 10. 未確定・要確認事項

- 遠隔交換のポイント消費者は、申請者のみか、双方か。
- 対面交換のポイント付与量を固定値にするか、素材種別ごとに変えるか。
- 交換単位はMVPでは1素材ごとで進めるか、複数素材交換も最初から考慮するか。
- 再交換を許可するか。許可する場合、`assets.source_asset_id` と `exchange_records` で流通経路を追跡する。
- `scrapbook_items` の配置方式は自由配置（`x`, `y`, `width`, `height`）か、固定枠（`slot_id`）か。
