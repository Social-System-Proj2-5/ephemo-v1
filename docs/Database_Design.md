# Database Design / 個人データベース・エフェメラ対面共有

## 1. 設計方針

- DB は Supabase PostgreSQL を利用する。
- Supabase Auth のユーザーに対応するアプリケーション用プロフィールを `profiles` で管理する。
- 完成ファイルの保存先として Supabase Storage bucket `ephemeras` を利用する。
- 素材は後端で保存せず、フロントエンド上で編集中のみ利用する。
- 編集中の素材は文字または画像のみとする。
- templateエフェメラはDBでは管理せず、現在は `public/ephemera/templates/*.png` のローカル画像として管理する。
- 作成済みエフェメラは、PDFまたは画像ファイルとして生成された後に `ephemeras` で管理する。
- エフェメラは1つだけ存在し、共有成立時にコピーせず `owner_profile_id` を移転する。
- エフェメラは作成から7日間だけ存在し、期限切れ後は `delete_expired_ephemeras()` で物理削除する。
- 現在のSQLには `status`, `deleted_at`, `metadata`, `last_shared_at`, `verification_method`, `preview_url` は存在しない。

## 2. ER概要

```txt
auth.users
  └─ profiles
       ├─ ephemeras
       └─ ephemera_transfer_records

storage.buckets
  └─ ephemeras
       └─ storage.objects
```

## 3. テーブル / Storage 一覧

| 種別 | 名前 | 定義ファイル | 役割 |
| --- | --- | --- | --- |
| Table | `profiles` | `docs/supabase-auth.sql` | Supabase Auth ユーザーに対応するプロフィール情報 |
| Table | `ephemeras` | `docs/ephemera-schema.sql` | PDFまたは画像として保存された作成済みエフェメラ |
| Table | `ephemera_transfer_records` | `docs/ephemera-schema.sql` | 共有/受け渡し結果の保存、所有者移転の根拠 |
| Storage bucket | `ephemeras` | `docs/ephemera-schema.sql` | 完成ファイルの保存先 |

## 4. Enum定義

### ephemera_file_type

| 値 | 意味 |
| --- | --- |
| `image` | 画像ファイル |
| `pdf` | PDFファイル |

## 5. テーブル定義

### 5.1 profiles

`profiles` は Supabase Auth の `auth.users` と 1対1 で対応する。

| カラム | 型 | NULL | デフォルト | 説明 |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | なし | `auth.users(id)` を参照するプロフィールID |
| `username` | citext | NO | なし | ログインに使うユーザー名。一意 |
| `display_name` | text | NO | なし | 表示名 |
| `auth_email` | text | NO | なし | Supabase Auth ログイン用に生成/保存するメールアドレス。一意 |
| `created_at` | timestamptz | NO | `now()` | 作成日時 |
| `updated_at` | timestamptz | NO | `now()` | 更新日時。`set_updated_at()` トリガーで更新 |

制約：

- `id` は `auth.users(id)` を参照し、Auth ユーザー削除時にプロフィールも削除する。
- `username` は `citext` で大文字小文字を区別せず一意にする。
- `auth_email` は Supabase Auth へのログインに使う内部用メールアドレスとして扱う。

### 5.2 ローカルテンプレートファイル

templateエフェメラはDBテーブルとしては持たない。
現在は作成画面内の定義から、`public/ephemera/templates/*.png` の画像を直接参照する。

現在のファイル：

```txt
public/ephemera/templates/template_receipt.png
public/ephemera/templates/template_ticket.png
public/ephemera/templates/template_tag.png
```

制約：

- テンプレート画像はアプリケーションのデプロイ物として管理する。
- templateエフェメラ自体は共有対象にしない。
- DB上にテンプレートテーブルは作成しない。

### 5.3 ephemeras

完成後にPDFまたは画像として保存されたエフェメラを管理する。
作成途中の素材や編集データは後端に保存しない。
エフェメラは1つだけ存在し、共有時にはコピーせず `owner_profile_id` を変更する。

| カラム | 型 | NULL | デフォルト | 説明 |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | `gen_random_uuid()` | エフェメラID |
| `owner_profile_id` | uuid | NO | なし | 現在の所有者プロフィールID。`profiles(id)` を参照 |
| `creator_profile_id` | uuid | NO | なし | 作成者プロフィールID。`profiles(id)` を参照 |
| `title` | text | NO | なし | エフェメラ名 |
| `file_type` | `ephemera_file_type` | NO | なし | `image` または `pdf` |
| `file_url` | text | NO | なし | 完成したPDFまたは画像ファイルURL |
| `created_at` | timestamptz | NO | `now()` | 作成日時 |
| `expires_at` | timestamptz | NO | `now() + interval '7 days'` | 有効期限日時 |
| `updated_at` | timestamptz | NO | `now()` | 更新日時。`set_updated_at()` トリガーで更新 |

制約：

- `owner_profile_id` は現在の所有者を表す。
- `creator_profile_id` は最初に作成したプロフィールを表す。
- 作成時は基本的に `owner_profile_id = creator_profile_id = auth.uid()` とする。
- `expires_at` は SQL デフォルトで作成から7日後になる。
- 通常APIでは `expires_at > now()` のものだけを操作対象にする。
- 共有成立時は `owner_profile_id` を共有先プロフィールへ変更する。
- 作成完了前の素材や編集途中データは保存しない。
- 保存できるのは完成したPDFまたは画像ファイルのみとする。
- 共有成立時にエフェメラのコピーを作成しない。

### 5.4 ephemera_transfer_records

共有/受け渡し結果を保存する。
現SQLでは、共有後にエフェメラ本体が移転または削除されても履歴を表示できるように、エフェメラ情報の一部をスナップショットとして持つ。

| カラム | 型 | NULL | デフォルト | 説明 |
| --- | --- | --- | --- | --- |
| `id` | uuid | NO | `gen_random_uuid()` | 共有記録ID |
| `sender_profile_id` | uuid | NO | なし | 共有元プロフィールID。`profiles(id)` を参照 |
| `recipient_profile_id` | uuid | NO | なし | 共有先プロフィールID。`profiles(id)` を参照 |
| `ephemera_id_snapshot` | uuid | YES | なし | 共有対象エフェメラIDのスナップショット |
| `ephemera_title_snapshot` | text | NO | なし | 共有時点のエフェメラ名 |
| `file_type_snapshot` | `ephemera_file_type` | NO | なし | 共有時点のファイル種別 |
| `transferred_at` | timestamptz | NO | `now()` | 共有成立日時 |
| `created_at` | timestamptz | NO | `now()` | 記録作成日時 |

制約：

- `sender_profile_id` は共有直前の所有者であること。
- `recipient_profile_id` は共有後の所有者であること。
- 共有履歴は通常操作では削除しない。
- 現SQLには失敗記録、共有方式、キャンセル理由のカラムはない。

## 6. Storage定義

### 6.1 storage.buckets

| カラム | 値 | 説明 |
| --- | --- | --- |
| `id` | `ephemeras` | bucket ID |
| `name` | `ephemeras` | bucket名 |
| `public` | `true` | 公開URLでファイルを参照できる |

### 6.2 storage.objects の運用

- `save-generated` API は、保存パスを `${user.id}/${Date.now()}-${randomUUID()}.${extension}` の形式で作成する。
- `save-image` API は、保存パスを `${user.id}/${fileName}` の形式で作成する。
- Storage RLS は、パス先頭のフォルダ名が `auth.uid()` と一致する場合にアップロード、更新、削除を許可する。
- bucket `ephemeras` のファイルは公開読み取り可能にする。

## 7. 共有成立時のトランザクション

1. `ephemeras` を取得してロックする。
2. `expires_at > now()` を確認する。
3. `ephemeras.owner_profile_id` が共有元プロフィールと一致することを確認する。
4. 共有先プロフィールが存在し、共有元プロフィールと異なることを確認する。
5. `ephemeras.owner_profile_id` を共有先プロフィールに更新する。
6. `ephemera_transfer_records` に共有結果とスナップショットを保存する。
7. 途中で失敗した場合はすべてロールバックする。

## 8. 期限切れエフェメラの処理

- 作成時に `expires_at` を必ず保存する。
- `expires_at` は SQL デフォルトで `now() + interval '7 days'` になる。
- 通常APIでは `expires_at > now()` を条件にする。
- スケジューラーで `delete_expired_ephemeras()` を定期的に実行する。
- 現在のSQLでは期限切れエフェメラを `delete from public.ephemeras where expires_at <= now()` で物理削除する。
- 期限切れ後は詳細表示、共有、再保存を許可しない。

## 9. エフェメラ保存処理

### 9.1 AI生成エフェメラ

1. フロントエンドで `/api/ephemera/generate` を呼び出して画像を生成する。
2. フロントエンドで `/api/ephemera/save-generated` を呼び出す。
3. API は `Authorization: Bearer <token>` から Supabase Auth ユーザーを取得する。
4. `imageDataUrl` または `imageUrl` から画像バイナリを取得する。
5. Storage bucket `ephemeras` に画像をアップロードする。
6. Storage の公開URLを `file_url` として取得する。
7. `ephemeras` に `owner_profile_id`, `creator_profile_id`, `title`, `file_type`, `file_url` を保存する。
8. 作成途中の素材や編集データは保存しない。

### 9.2 手動作成エフェメラ

1. フロントエンドで文字素材または画像素材を編集する。
2. フロントエンドで完成したエフェメラをPDFまたは画像に変換する。
3. フロントエンドで `Authorization: Bearer <token>` を付けて `/api/ephemera/save-image` を呼び出す。
4. API は Supabase Auth のユーザーを取得し、Storage bucket `ephemeras` のユーザーフォルダに完成ファイルをアップロードする。
5. Storage の公開URLを `file_url` として取得する。
6. `ephemeras` に `owner_profile_id`, `creator_profile_id`, `title`, `file_type`, `file_url`, `expires_at` を保存する。
7. `owner_profile_id` と `creator_profile_id` には認証ユーザーのIDを保存する。
8. `expires_at` には保存時刻から7日後を保存する。
9. API は `ephemeraId`, `fileName`, `url`, `expiresAt` を返す。
10. DB登録に失敗した場合は、先にアップロードしたStorageファイルを削除する。
11. 作成途中の素材や編集データは保存しない。

## 10. インデックス

| テーブル | インデックス | 用途 |
| --- | --- | --- |
| `ephemeras` | `ephemeras_owner_profile_id_idx` on `(owner_profile_id)` | 自分のエフェメラ一覧 |
| `ephemeras` | `ephemeras_creator_profile_id_idx` on `(creator_profile_id)` | 作成者別の参照 |
| `ephemeras` | `ephemeras_expires_at_idx` on `(expires_at)` | 期限切れ自動削除 |
| `ephemera_transfer_records` | `ephemera_transfer_records_sender_idx` on `(sender_profile_id, transferred_at desc)` | 共有元プロフィール別履歴 |
| `ephemera_transfer_records` | `ephemera_transfer_records_recipient_idx` on `(recipient_profile_id, transferred_at desc)` | 共有先プロフィール別履歴 |

## 11. RLS / アクセス制御方針

### profiles

- `profiles` は `auth.uid() = id` のものだけ参照できる。
- `profiles` は `auth.uid() = id` のものだけ追加できる。
- `profiles` は `auth.uid() = id` のものだけ更新できる。

### ephemeras

- `ephemeras` は `auth.uid() = owner_profile_id` のものだけ参照できる。
- `ephemeras` は `auth.uid() = owner_profile_id` かつ `auth.uid() = creator_profile_id` のものだけ追加できる。
- `ephemeras` は `auth.uid() = owner_profile_id` のものだけ更新できる。

### ephemera_transfer_records

- `ephemera_transfer_records` は `auth.uid() = sender_profile_id` または `auth.uid() = recipient_profile_id` のものだけ参照できる。
- `ephemera_transfer_records` は `auth.uid() = sender_profile_id` のものだけ追加できる。

### storage.objects

- bucket `ephemeras` のファイルは公開読み取り可能にする。
- bucket `ephemeras` への追加、更新、削除は、パス先頭のフォルダ名が `auth.uid()` と一致する場合だけ許可する。

## 12. MVP設計メモ

- 素材はフロントエンドでのみ編集し、後端には保存しない。
- エフェメラ作成はローカルテンプレート画像、文字、画像をフロントエンドで組み合わせて行う。
- 完成したエフェメラだけをPDFまたは画像として保存する。
- 保存形式は `image` または `pdf` から開始する。
- 共有時はエフェメラをコピーせず、`owner_profile_id` だけを変更する。
- 7日経過後の削除は、現在のSQLに合わせて物理削除で扱う。

## 13. 未確定事項

- テンプレートを今後も `public/ephemera/templates/*.png` の画像だけで管理するか、JSONメタデータを追加するか。
- 期限切れエフェメラを物理削除のままにするか、`status` や `deleted_at` を追加して論理削除にするか。
- 共有履歴に `verification_method` や失敗/キャンセル記録を追加するか。
