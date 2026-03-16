<?php

declare(strict_types=1);

namespace App\GridMakers\Filter;

use JsonSerializable;

class FilterableKeyBelongsToOptions implements JsonSerializable
{
    public function __construct(private readonly string $to, private readonly FilterableKeysDict $keys)
    {
    }

    public function getTo(): string
    {
        return $this->to;
    }

    public function getKeys(): FilterableKeysDict
    {
        return $this->keys;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'to' => $this->to,
            'keys' => $this->keys,
        ];
    }
}
