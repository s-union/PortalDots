# HTTP Layer

`backend/internal/http` は API サーバーの入口を人間が追いやすくするためのディレクトリです。

- `server/`: `cmd/api` から参照される composition root
- `public/`, `workspace/`, `staff/`: 今後の feature-first 再編先
- `shared/`: transport 共通部品の置き場

現時点では安全な移行を優先し、`server/` が既存 `internal/controllers` を包む形で動作します。
feature package への本体移設はこの入口を起点に段階的に進めます。
