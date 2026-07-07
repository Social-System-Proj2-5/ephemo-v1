# Database Design / 個人データベース・エフェメラ対面共有

## 1. 設計方針

- 素材は後端で保存せず、フロントエンド上で編集中のみ利用する。
- 編集中の素材は文字または画像のみとする。
- 動画素材、音声素材は扱わない。
- templateエフェメラはDBでは管理せず、サーバー上のローカルテンプレートファイルとして管理する。
- 作成済みエフェメラは、PDFまたは画像ファイルとして生成された後に `ephemeras` で管理する。
- スクラップブックは扱わない。
- エフェメラは交換ではなく、対面共有で他ユーザーへ渡す。
- 共有はオンラインでは行わず、対面確認を伴うものだけを扱う。
- エフェメラは1つだけ存在し、共有成立時にコピーせず所有者を移転する。
- エフェメラは作成から7日間だけ存在し、期限切れ後は自動削除または期限切れ状態にする。
- エフェメラは完成時にPDFまたは画像として保存されるため、独立したファイル出力履歴テーブルは持たない。

## 2. ER概要

```txt
users
  ├─ ephemeras
  └─ share_records
```

## 3. テーブル一覧

| テーブル | 役割 |
| --- | --- |
| `users` | ユーザー情報 |
| `ephemeras` | PDFまたは画像として保存された作成済みエフェメラ |
| `share_records` | 共有結果の保存、所有者移転の根拠 |

## 4. Enum定義

### ephemera_file_format

| 値 | 意味 |
| --- | --- |
| `pdf` | PDFファイル |
| `image` | 画像ファイル |

### ephemera_status

| 値 | 意味 |
| --- | --- |
| `active` | 有効 |
| `shared` | 共有により所有者移転済み |
| `expired` | 7日経過により期限切れ |
| `deleted` | ユーザー操作または自動処理で削除済み |

### face_to_face_method

| 値 | 意味 |
| --- | --- |
| `qr` | QRコード読み取り |
| `nfc` | NFC |
| `bluetooth` | Bluetooth |
| `manual` | 手動承認 |

## 5. テーブル定義

### 5.1 users

| カラム | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| `id` | uuid | NO | ユーザーID |
| `email` | text | NO | メールアドレス |
| `display_name` | text | NO | 表示名 |
| `icon_url` | text | YES | アイコン画像URL |
| `created_at` | timestamptz | NO | 作成日時 |
| `updated_at` | timestamptz | NO | 更新日時 |

### 5.2 ローカルテンプレートファイル

templateエフェメラはDBテーブルとしては持たない。
サーバー上のローカルファイルとして管理し、APIはそのファイルを読み取って一覧や詳細を返す。

想定ファイル：

```txt
server/templates/{template_key}.json
```

テンプレートファイルに含める情報：

| 項目 | 説明 |
| --- | --- |
| `template_key` | テンプレート識別子。ファイル名と対応する |
| `name` | template名 |
| `description` | 説明 |
| `layout_schema` | レイアウト定義 |
| `input_schema` | 入力項目定義 |

制約：

- テンプレートファイルはアプリケーションのデプロイ物として管理する。
- templateエフェメラ自体は共有対象にしない。
- DB上にテンプレートテーブルは作成しない。

### 5.3 ephemeras

完成後にPDFまたは画像として保存されたエフェメラを管理する。
作成途中の素材や編集データは後端に保存しない。
エフェメラは1つだけ存在し、共有時にはコピーせず所有者を変更する。

| カラム | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| `id` | uuid | NO | エフェメラID |
| `owner_user_id` | uuid | NO | 現在の所有者ユーザーID |
| `template_key` | text | YES | 利用したローカルテンプレートファイルの識別子 |
| `title` | text | NO | エフェメラ名 |
| `file_url` | text | NO | 完成したPDFまたは画像ファイルURL |
| `file_format` | ephemera_file_format | NO | `pdf` または `image` |
| `preview_url` | text | YES | 一覧表示用プレビュー画像URL |
| `metadata` | jsonb | YES | 表示用の補足情報 |
| `status` | ephemera_status | NO | 状態 |
| `created_at` | timestamptz | NO | 作成日時 |
| `expires_at` | timestamptz | NO | 有効期限日時。作成から7日後 |
| `last_shared_at` | timestamptz | YES | 最後に共有された日時 |
| `deleted_at` | timestamptz | YES | 削除日時 |
| `updated_at` | timestamptz | NO | 更新日時 |

制約：

- `expires_at = created_at + interval '7 days'` を基本とする。
- `deleted_at is null` かつ `expires_at > now()` の場合のみ通常操作対象とする。
- 共有成立時は `owner_user_id` を共有先ユーザーへ変更する。
- 作成完了前の素材や編集途中データは保存しない。
- 保存できるのは完成したPDFまたは画像ファイルのみとする。
- 共有成立時にエフェメラのコピーを作成しない。

### 5.4 share_records

成立・不成立を含む共有結果を保存する。所有者移転の根拠データになるため、通常操作では削除しない。

| カラム | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| `id` | uuid | NO | 共有記録ID |
| `ephemera_id` | uuid | NO | 共有対象エフェメラID |
| `from_user_id` | uuid | NO | 共有元ユーザーID |
| `to_user_id` | uuid | YES | 共有先ユーザーID |
| `result` | text | NO | 共有結果 |
| `verification_method` | face_to_face_method | YES | 対面確認方式 |
| `shared_at` | timestamptz | NO | 共有日時 |
| `created_at` | timestamptz | NO | 作成日時 |

制約：

- 共有成立時の `from_user_id` は、共有直前の所有者であること。
- 共有成立時の `to_user_id` は、共有後の所有者であること。
- 共有記録は削除しない、または通常操作では削除できない。

## 6. 共有成立時のトランザクション

1. `ephemeras` を取得してロックする。
2. エフェメラが期限切れまたは削除済みでないことを確認する。
3. エフェメラの現在所有者が共有元ユーザーと一致することを確認する。
4. 対面確認方式と共有先ユーザーをリクエスト内容から確認する。
5. `ephemeras.owner_user_id` を共有先ユーザーに更新する。
6. `ephemeras.last_shared_at` を更新する。
7. `share_records` に共有結果を保存する。
8. 途中で失敗した場合はすべてロールバックする。

## 7. 期限切れエフェメラの処理

- 作成時に `expires_at` を必ず保存する。
- 通常APIでは `expires_at > now()` かつ `deleted_at is null` を条件にする。
- スケジューラーで期限切れエフェメラを定期的に処理する。
- MVPでは論理削除または `status = 'expired'` にする。
- 期限切れ後は詳細表示、共有、再保存を許可しない。

## 8. エフェメラ保存処理

1. フロントエンドで文字素材または画像素材を編集する。
2. フロントエンドで完成したエフェメラをPDFまたは画像に変換する。
3. 完成ファイルをアップロードする。
4. `ephemeras.file_url` と `ephemeras.file_format` を保存する。
5. 作成日時から7日後を `expires_at` に保存する。
6. 作成途中の素材や編集データは保存しない。

## 9. インデックス案

| テーブル | インデックス | 用途 |
| --- | --- | --- |
| `ephemeras` | `(owner_user_id, deleted_at, expires_at)` | 自分の有効エフェメラ一覧 |
| `ephemeras` | `(expires_at, deleted_at)` | 期限切れ自動削除 |
| `share_records` | `(from_user_id, shared_at)` | 共有元ユーザー別履歴 |
| `share_records` | `(to_user_id, shared_at)` | 共有先ユーザー別履歴 |

## 10. RLS / アクセス制御方針

- `ephemeras` は `owner_user_id = auth.uid()` のものだけ通常操作できる。
- `share_records` は共有元または共有先のユーザーのみ参照できる。
- 期限切れまたは削除済みのエフェメラは通常APIで参照対象外にする。

## 11. MVP設計メモ

- 素材はフロントエンドでのみ編集し、後端には保存しない。
- エフェメラ作成はローカルテンプレートファイル、文字、画像をフロントエンドで組み合わせて行う。
- 完成したエフェメラだけをPDFまたは画像として保存する。
- 対面共有はMVPではQRコードまたは手動承認から開始する。
- 共有時はエフェメラをコピーせず、所有者だけを変更する。
- 7日経過後の削除は、まず `status = 'expired'` と `deleted_at` 更新の論理削除で実装する。
- 保存形式はPDFまたは画像から開始する。

## 12. 未確定事項

- 対面確認方式をMVPでQRコードに限定するか、手動承認も含めるか。
- 期限切れエフェメラを物理削除するか、論理削除で保持するか。
- 完成ファイルの保存形式をPDF優先にするか画像優先にするか。
- 共有履歴にエフェメラの内容スナップショットを残すか、最小限のIDだけにするか。
