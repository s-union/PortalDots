#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

staged_files=()
while IFS= read -r -d '' path; do
  staged_files+=("$path")
done < <(git diff --cached --name-only --diff-filter=ACMR -z)

mise run format

if [[ "${#staged_files[@]}" -eq 0 ]]; then
  exit 0
fi

files_to_restage=()
for path in "${staged_files[@]}"; do
  if [[ -e "$path" ]] && ! git diff --quiet -- "$path"; then
    files_to_restage+=("$path")
  fi
done

if [[ "${#files_to_restage[@]}" -eq 0 ]]; then
  exit 0
fi

git add -- "${files_to_restage[@]}"
