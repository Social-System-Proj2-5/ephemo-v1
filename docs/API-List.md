# API一覧表案 / Next.js Route Handlers

## 1. 前提

- 現在の実装は Next.js App Router の Route Handler として `src/app/api/**/route.ts` に置く。
- リクエストとレスポンスは原則 JSON とする。
- ファイル送信は `multipart/form-data` とする。
- 認証は Supabase Auth のセッションまたは `Authorization: Bearer <access_token>` を利用する。
- DB は Supabase PostgreSQL を利用する。
- 完成ファイルの永続保存先は、現在 `public/ephemera/saved/` と Supabase Storage bucket `ephemeras` が併存している。
- DB 登録済みエフェメラは `ephemeras` テーブルで管理する。
- フロントエンドから DB へ直接書き込まず、保存や共有の更新処理は API を経由する。
- 素材は後端で保存せず、フロントエンド上で編集中のみ利用する。
- 編集中の素材種別は `text` と `image` のみとする。
- テンプレートは DB では管理せず、現在は `public/ephemera/templates/*.png` のローカル画像として管理する。
- エフェメラは1つだけ存在し、共有成立時に所有者を共有先プロフィールへ移す。
- エフェメラは作成から7日後に期限切れとなり、自動削除対象になる。

## 2. 現在のファイル構造

### 実装済み API

| 実装ファイル | URL | Method | 用途 |
| --- | --- | --- | --- |
| `src/app/api/auth/signup/route.ts` | `/api/auth/signup` | POST | 新規登録 |
| `src/app/api/auth/login/route.ts` | `/api/auth/login` | POST | ログイン |
| `src/app/api/health/supabase/route.ts` | `/api/health/supabase` | GET | Supabase疎通確認 |
| `src/app/api/ephemera/generate/route.ts` | `/api/ephemera/generate` | POST | OpenAI API による画像生成 |
| `src/app/api/ephemera/save-image/route.ts` | `/api/ephemera/save-image` | POST | 手動作成エフェメラのローカルファイル保存 |
| `src/app/api/ephemera/save-generated/route.ts` | `/api/ephemera/save-generated` | POST | AI生成エフェメラを Supabase Storage と `ephemeras` に保存 |

### 関連画面

| 画面ファイル | 用途 | 主なAPI呼び出し |
| --- | --- | --- |
| `src/app/signup/page.tsx` | 新規登録画面 | `POST /api/auth/signup` |
| `src/app/login/page.tsx` | ログイン画面 | `POST /api/auth/login` |
| `src/app/page.tsx` | ホーム画面、セッション確認、ログアウト | Supabase client |
| `src/app/ephemera/page.tsx` | エフェメラ一覧画面。現在はモック表示 | なし |
| `src/app/ephemera/create/page.tsx` | 手動エフェメラ作成画面 | `POST /api/ephemera/save-image` |
| `src/app/ephemera/ai-create/page.tsx` | AIエフェメラ作成画面 | `POST /api/ephemera/generate`, `POST /api/ephemera/save-generated` |

### ローカルファイル

| ファイル/ディレクトリ | 用途 |
| --- | --- |
| `public/ephemera/templates/template_receipt.png` | レシート型テンプレート画像 |
| `public/ephemera/templates/template_ticket.png` | チケット型テンプレート画像 |
| `public/ephemera/templates/template_tag.png` | タグ型テンプレート画像 |
| `public/ephemera/stamps/*.png` | 作成画面で利用するスタンプ画像 |
| `public/ephemera/saved/` | `save-image` API が保存する完成ファイル |

## 3. 想定DB / Storage

現在の SQL は `docs/supabase-auth.sql` と `docs/ephemera-schema.sql` に分かれている。

| 種別 | 名前 | 用途 |
| --- | --- | --- |
| Table | `profiles` | Supabase Auth ユーザーに対応するプロフィール情報 |
| Table | `ephemeras` | PDFまたは画像として保存された作成済みエフェメラ |
| Table | `ephemera_transfer_records` | 共有/受け渡し結果の保存、所有者移転の根拠 |
| Storage bucket | `ephemeras` | AI生成エフェメラ画像などの完成ファイル保存先 |

## 4. API一覧

### 4.1 認証・プロフィール系 API

| No | 状態 | 機能 | Method | URL | 実装ファイル | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 実装済み | 新規登録 | POST | `/api/auth/signup` | `src/app/api/auth/signup/route.ts` | `username`, `displayName`, `password` | `user`, `session` | Supabase Auth にユーザーを作成し、`profiles` に `id`, `username`, `display_name`, `auth_email` を追加 |
| 2 | 実装済み | ログイン | POST | `/api/auth/login` | `src/app/api/auth/login/route.ts` | `username`, `password` | `user`, `session` | `profiles.username` から `auth_email` を取得し、Supabase Auth にログイン |
| 3 | 実装済み | ログアウト | なし | なし | `src/app/page.tsx` | なし | なし | フロントエンドから Supabase client の `auth.signOut()` を実行 |
| 4 | 未実装 | 自分のプロフィール取得 | GET | `/api/profile/me` | なし | なし | `id`, `username`, `displayName` | `profiles` を取得 |
| 5 | 未実装 | 表示名更新 | PATCH | `/api/profile/me` | なし | `displayName` | 更新後のプロフィール | `profiles.display_name` を更新 |

### 4.2 ヘルスチェック API

| No | 状態 | 機能 | Method | URL | 実装ファイル | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | 実装済み | Supabase疎通確認 | GET | `/api/health/supabase` | `src/app/api/health/supabase/route.ts` | なし | `ok`, `service` またはエラー | Supabase REST エンドポイントへ接続確認 |

### 4.3 テンプレート API

現在、テンプレートは API 化されておらず、作成画面内の定義から `public/ephemera/templates/*.png` を参照している。

| No | 状態 | 機能 | Method | URL | 実装ファイル | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- | --- | --- |
| 7 | 未実装 | テンプレート一覧取得 | GET | `/api/ephemera/templates` | なし | なし | `templates[]` | DBは使わず、ローカルテンプレート画像のメタ情報を返す |
| 8 | 未実装 | テンプレート詳細取得 | GET | `/api/ephemera/templates/{template_key}` | なし | `template_key` | テンプレート詳細 | DBは使わず、該当するローカルテンプレート画像のメタ情報を返す |

### 4.4 エフェメラ作成・保存 API

| No | 状態 | 機能 | Method | URL | 実装ファイル | フロントから送るもの | バックエンドが返すもの | DB / Storage との関わり |
| --: | --- | --- | --- | --- | --- | --- | --- | --- |
| 9 | 実装済み | AI画像生成 | POST | `/api/ephemera/generate` | `src/app/api/ephemera/generate/route.ts` | JSON: `text`, `illustration`, `atmosphere`, `style` / multipart: 左記 + `sourceImage` | `imageUrl`, `imageDataUrl`, `revisedPrompt`, `prompt` | DBは使わず、OpenAI API を呼び出す |
| 10 | 実装済み | 手動作成エフェメラのローカル保存 | POST | `/api/ephemera/save-image` | `src/app/api/ephemera/save-image/route.ts` | `name`, `format`, `width`, `height`, `file`, `textLayers` 任意 | `fileName`, `url` | 現在はDB未登録。`public/ephemera/saved/` にファイル保存のみ行う |
| 11 | 実装済み | AI生成エフェメラ保存 | POST | `/api/ephemera/save-generated` | `src/app/api/ephemera/save-generated/route.ts` | `Authorization: Bearer <token>`, `title`, `imageDataUrl` または `imageUrl`, `prompt` 任意 | `ephemera` | Storage bucket `ephemeras` に画像を保存し、`ephemeras` に `owner_profile_id`, `creator_profile_id`, `title`, `file_type`, `file_url` を追加 |
| 12 | 未実装 | 手動作成エフェメラのDB登録 | POST | `/api/ephemera` | なし | `title`, `file_type`, `file_url` | `id`, `file_url`, `expires_at` | `ephemeras` に `owner_profile_id`, `creator_profile_id`, `title`, `file_type`, `file_url` を追加 |
| 13 | 未実装 | エフェメラ一覧取得 | GET | `/api/ephemera` | なし | なし | `ephemeras[]` | `ephemeras.owner_profile_id = auth.uid()` かつ `expires_at > now()` のものを取得 |
| 14 | 未実装 | エフェメラ詳細取得 | GET | `/api/ephemera/{ephemera_id}` | なし | `ephemera_id` | エフェメラ詳細、残り有効期間、ファイルURL | `ephemeras` を取得 |

### 4.5 対面共有 API

現在の SQL では、共有履歴テーブルは `share_records` ではなく `ephemera_transfer_records`。
また、現SQLには共有方式、失敗理由、キャンセル理由のカラムはない。

| No | 状態 | 機能 | Method | URL | 実装ファイル | フロントから送るもの | バックエンドが返すもの | DBとの関わり |
| --: | --- | --- | --- | --- | --- | --- | --- | --- |
| 15 | 未実装 | 対面共有確定 | POST | `/api/ephemera/transfers/confirm` | なし | `ephemera_id`, `recipient_profile_id`, `confirm: true` | 共有成立結果、現在所有者 | `ephemeras.owner_profile_id` を共有先へ変更し、`ephemera_transfer_records` にスナップショットを追加 |
| 16 | 未実装 | 共有履歴取得 | GET | `/api/ephemera/transfers` | なし | `limit`, `offset` 任意 | `transfer_records[]` | 自分が `sender_profile_id` または `recipient_profile_id` の `ephemera_transfer_records` を取得 |
| 17 | 未実装 | 共有履歴詳細取得 | GET | `/api/ephemera/transfers/{record_id}` | なし | `record_id` | 共有詳細 | `ephemera_transfer_records` を取得 |

### 4.6 メンテナンス API / 内部処理

| No | 状態 | 機能 | Method | URL | 実装場所 | 実行主体 | 処理内容 |
| --: | --- | --- | --- | --- | --- | --- | --- |
| 18 | SQLのみ | 期限切れエフェメラ削除 | 内部処理 | なし | `docs/ephemera-schema.sql` | スケジューラー | `public.delete_expired_ephemeras()` で `expires_at <= now()` の `ephemeras` を物理削除する |

## 5. 共有確定時のバックエンド処理

共有確定時は以下を同一トランザクションで処理する。

1. 共有対象エフェメラを取得してロックする。
2. 共有元プロフィールと共有先プロフィールが同一でないことを確認する。
3. エフェメラの `expires_at > now()` を確認する。
4. エフェメラの `owner_profile_id` が共有元プロフィールであることを確認する。
5. 対面確認が完了していることを確認する。
6. `ephemeras.owner_profile_id` を共有先プロフィールへ変更する。
7. `ephemera_transfer_records` に `sender_profile_id`, `recipient_profile_id`, `ephemera_id_snapshot`, `ephemera_title_snapshot`, `file_type_snapshot` を追加する。

## 6. エフェメラ期限管理

- エフェメラ作成時、`expires_at` は SQL デフォルトで `now() + interval '7 days'` になる。
- API は `expires_at > now()` のエフェメラだけを通常操作対象にする。
- 期限切れエフェメラは共有できない。
- 期限切れエフェメラは再保存、共有できない。
- 現在の SQL では `delete_expired_ephemeras()` が期限切れエフェメラを物理削除する。
- `deleted_at` や `status` による論理削除は現在の SQL には存在しない。

## 7. バリデーション

- 後端は作成途中の素材を管理するAPIを提供しない。
- エフェメラ保存時の `file_type` は `image` または `pdf` のみ許可する。
- エフェメラ保存時は完成したファイルのみ受け付ける。
- テンプレートはローカルファイルから読み取り、DBには保存しない。
- templateエフェメラ自体は共有対象にしない。
- 共有対象は有効期限内の作成済みエフェメラのみとする。
- 共有時にエフェメラをコピーしない。
- 共有後、元の所有者は対象エフェメラの詳細表示、共有を実行できない。
- オンライン共有や遠隔共有を示す共有種別は受け付けない。

## 8. MVP API 範囲

- 認証 API: `POST /api/auth/signup`, `POST /api/auth/login`
- AI画像生成 API: `POST /api/ephemera/generate`
- AI生成エフェメラ保存 API: `POST /api/ephemera/save-generated`
- 手動作成エフェメラ保存 API: `POST /api/ephemera/save-image`
- エフェメラ一覧/詳細 API: `GET /api/ephemera`, `GET /api/ephemera/{ephemera_id}`
- 対面共有確定 API: `POST /api/ephemera/transfers/confirm`
- 共有履歴 API: `GET /api/ephemera/transfers`
- 期限切れエフェメラ自動削除処理: `public.delete_expired_ephemeras()`
