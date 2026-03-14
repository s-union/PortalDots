# App Layer

`internal/app` contains process-level application behavior.

At the moment this mainly means workers and one-shot jobs, such as mail processing in `worker/`.

Use this layer for orchestration that belongs to a running process rather than a business feature package.
