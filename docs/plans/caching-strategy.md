# キャッシュ戦略実装計画

## 決定事項

| # | 決定 | 内容 |
|---|------|------|
| 1 | スコープ | Backend HTTP ヘッダー + Backend マスターデータキャッシュ + Frontend を並行して着手 |
| 2 | バックエンド配置 | Repository デコレータパターン（`CachedRepository` で `SQLCRepository` をラップ） |
| 3 | 無効化戦略 | TTL ベース（30秒〜5分の自然失効） |
| 4 | フロントエンド | `staleTime` チューニング + 一覧画面の次ページ `prefetch` |

## 前提条件

- 外部キャッシュライブラリは追加しない（`sync.RWMutex` + `map` + TTL で標準ライブラリのみ）
- Redis 等の外部依存は導入しない（単一インスタンス前提のアプリケーションのため）
- 既存の Repository インターフェースは変更しない
- デモモード（`MemoryRepository`）にはキャッシュ不要（既にインメモリ）

## 実装ステップ

### Phase A: バックエンド — マスターデータ Repository キャッシュ

**対象**: `tag`, `place`, `contactcategory`, `participationtype` の4ドメイン

#### Step A1: 汎用キャッシュユーティリティの作成

**ファイル**: `backend/internal/platform/cache/cache.go`

- 汎用の `TTLCache[T any]` 構造体を作成
- `sync.RWMutex` + `map` + TTL で実装
- `Get(key) (T, bool)` / `Set(key, T)` / `Invalidate()` メソッド
- TTL 超過時に自動失効

#### Step A2: CachedRepository デコレータの作成

各ドメインに `cached.go` を追加:

- `backend/internal/domain/tag/cached.go` — `CachedRepository`
- `backend/internal/domain/place/cached.go` — `CachedRepository`
- `backend/internal/domain/contactcategory/cached.go` — `CachedRepository`
- `backend/internal/domain/participationtype/cached.go` — `CachedRepository`

各 `CachedRepository`:
- 内部に元の `Repository` と `TTLCache` を保持
- `List()` はキャッシュヒット時はキャッシュから、ミス時は元 Repository から取得してキャッシュに保存
- `Create/Update/Delete` は元 Repository に委譲 + キャッシュを `Invalidate()`
- TTL: マスターデータは **5分**

#### Step A3: DI 配線の更新

**ファイル**: `backend/cmd/server/main.go`（または SQLC 初期化箇所）

- SQLC モード時に `NewSQLCRepository()` の代わりに `NewCachedRepository(NewSQLCRepository(...))` を使用
- デモモード時は `MemoryRepository` のまま（変更なし）

#### Step A4: テスト

- `cached_test.go` を各ドメインに追加
- キャッシュヒット時の DB 呼び出しなしを検証
- TTL 失効後の再取得を検証
- `Create/Update/Delete` 後のキャッシュ無効化を検証

---

### Phase B: バックエンド — セッション解決キャッシュ

**対象**: `session.SQLCStore.Get()` 内の `GetUserByID` + `ListUserRoles` + `ListUserPermissions`

#### Step B1: ユーザー情報キャッシュの追加

**ファイル**: `backend/internal/domain/session/sqlc.go`

- `SQLCStore` に `userCache` フィールドを追加（`TTLCache[auth.User]`、キーは `userID`）
- `Get()` 内でユーザー情報をキャッシュから取得、ミス時のみ DB クエリ
- TTL: **1分**（ロール/権限の変更は比較的早く反映すべき）

#### Step B2: キャッシュ無効化

- `SQLCStore` に `InvalidateUser(userID)` メソッドを追加
- ユーザーのプロフィール/表示名/ロール/権限変更時に、更新成功後かつセッション再構成前に該当ユーザーのキャッシュを無効化する

---

### Phase C: バックエンド — HTTP キャッシュヘッダー

**対象**: 公開エンドポイント（認証不要）

#### Step C1: キャッシュヘッダーミドルウェア

**ファイル**: `backend/internal/middlewares/cache.go`

- `CacheControl(maxAge, public)` ヘルパー関数を作成
- `ETag(body)` ヘルパー関数を作成（レスポンスボディのハッシュから生成）

#### Step C2: 公開エンドポイントへの適用

**ファイル**: `backend/internal/controllers/public_home.go`

| エンドポイント | Cache-Control |
|---------------|---------------|
| `GET /public/config` | `public, max-age=600` |
| `GET /public/documents/:id` | `public, max-age=60` |
| `GET /public/documents` | `public, max-age=60` + ETag |
| `GET /public/pages` | `public, max-age=60` + ETag |
| `GET /public/pages/:id` | `public, max-age=60` + ETag |

---

### Phase D: フロントエンド — staleTime チューニング

#### Step D1: クエリキー定数の整理

**ファイル**: `frontend/src/lib/api/queryKeys.ts`（新規）

- クエリキーを定数化して一元管理
- データ種別ごとに分類

#### Step D2: staleTime の個別設定

各機能の `useQuery` / `useQueryData` 呼び出しに `staleTime` を明示的に設定:

| データ種別 | staleTime | 対象クエリ |
|-----------|-----------|-----------|
| マスターデータ | `5 * 60 * 1000`（5分） | tags, places, contact-categories, participation-types |
| 公開設定 | `10 * 60 * 1000`（10分） | public/config |
| セッション | `60 * 1000`（1分） | session/bootstrap |
| ドキュメント詳細 | `60 * 1000`（1分） | documents/:id（同じ ID の内容が更新される可能性がある） |
| 動的データ | `30_000`（30秒、現状維持） | circles, forms, pages, answers, users |

#### Step D3: グローバルデフォルトの見直し

**ファイル**: `frontend/src/app/providers/queryClient.ts`

- `staleTime: 30_000` を維持（フォールバックとして適切）
- `gcTime: 5 * 60 * 1000`（5分）を追加 — 未使用クエリのメモリ解放

---

### Phase E: フロントエンド — ページネーション prefetch

#### Step E1: prefetch ヘルパーの作成

**ファイル**: `frontend/src/lib/api/prefetch.ts`（新規）

- `usePrefetchNextPage(queryKey, fetcher, currentPage)` composable
- 現在のページのデータ取得完了後に、次のページの `prefetchQuery` を実行

#### Step E2: 一覧画面への適用

以下の一覧画面に prefetch を追加:

- `frontend/src/features/staff/circles/` — サークル一覧
- `frontend/src/features/staff/pages/` — お知らせ一覧
- `frontend/src/features/staff/forms/` — フォーム一覧
- `frontend/src/features/staff/documents/` — ドキュメント一覧
- `frontend/src/features/staff/users/` — ユーザー一覧
- `frontend/src/features/pages/` — ワークスペースお知らせ一覧
- `frontend/src/features/documents/` — ワークスペースドキュメント一覧
- `frontend/src/features/forms/` — ワークスペースフォーム一覧

---

## 実装順序

```
Phase A (マスターデータキャッシュ)  ← 最もDB負荷削減効果が高い
  ↓
Phase B (セッションキャッシュ)     ← 全認証リクエストに影響
  ↓
Phase C (HTTPヘッダー)            ← 独立して実装可能
  ↓
Phase D (staleTime)               ← 独立して実装可能
  ↓
Phase E (prefetch)                ← Phase D の後に実装
```

Phase C/D は Phase A/B と並行して着手可能。

## 検証方法

### バックエンド
- `mise run backend:test` — 全テスト通過
- `mise run backend:check` — staticcheck 通過
- キャッシュデコレータのユニットテストでヒット率を検証

### フロントエンド
- `mise run frontend:check` — typecheck + lint 通過
- `cd frontend && pnpm test` — Vitest 通過
- ブラウザ DevTools Network タブでマスターデータ API のリクエスト頻度を確認

## 対象外（Out of Scope）

- Redis 等の外部キャッシュ導入
- CDN（Cloudflare等）でのエッジキャッシュ
- Service Worker を使ったオフラインキャッシュ
- ドキュメントバイナリの S3/OSS への移行
- WebSocket/Server-Sent Events によるキャッシュ無効化プッシュ通知
