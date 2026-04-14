# @portaldots/email-templates

React Email ベースのメールテンプレート定義です。

## 使い方

```sh
nr generate
```

`backend/internal/shared/mailrender/generated/` に Go 向けの `html/template` / `text/template` 互換ファイルを書き出します。

```sh
nr dev
```

React Email の preview server が `http://localhost:3000` で起動し、`src/emails/*.tsx` を目視確認できます。
