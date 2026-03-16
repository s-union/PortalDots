<?php

declare(strict_types=1);

namespace App\Services\Utils\ValueObjects;

use Carbon\CarbonImmutable;

final readonly class Release
{
    public function __construct(
        /**
         * バージョン
         */
        private Version $version,
        /**
         * リリース公開日時
         */
        private CarbonImmutable $publishedAt,
        /**
         * リリースノートのURL
         */
        private string $htmlUrl,
        /**
         * リリースのダウンロードURL(ZIP)
         */
        private string $browserDownloadUrl,
        /**
         * ダウンロード ZIP のサイズ(単位 : バイト)
         */
        private int $size,
        /**
         * リリースノートテキスト(Markdownテキスト)
         */
        private string $body
    )
    {
    }

    public function getVersion(): Version
    {
        return $this->version;
    }

    public function getPublishedAt(): CarbonImmutable
    {
        return $this->publishedAt;
    }

    public function getHtmlUrl(): string
    {
        return $this->htmlUrl;
    }

    public function getBrowserDownloadUrl(): string
    {
        return $this->browserDownloadUrl;
    }

    public function getSize(): int
    {
        return $this->size;
    }

    public function getBody(): string
    {
        return $this->body;
    }
}
