<?php

declare(strict_types=1);

namespace App\Eloquents\ValueObjects;

use JsonSerializable;

final readonly class PermissionInfo implements JsonSerializable
{
    public function __construct(
        /**
         * 権限の識別名
         */
        private string $identifier,
        /**
         * 権限の表示名
         */
        private string $display_name,
        /**
         * 権限の短縮名
         */
        private string $display_short_name,
        /**
         * 権限の説明(HTML可)
         */
        private string $description_html
    )
    {
    }

    public function getIdentifier()
    {
        return $this->identifier;
    }

    public function getDisplayName()
    {
        return $this->display_name;
    }

    public function getDisplayShortName()
    {
        return $this->display_short_name;
    }

    public function getDescriptionHtml()
    {
        return $this->description_html;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'identifier' => $this->identifier,
            'display_name' => $this->display_name,
            'display_short_name' => $this->display_short_name,
            'description_html' => $this->description_html,
        ];
    }
}
