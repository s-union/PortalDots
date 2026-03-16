<?php

declare(strict_types=1);

namespace App\GridMakers\Filter;

use JsonSerializable;

class FilterableKeyBelongsToManyOptions implements JsonSerializable
{
    public function __construct(private readonly string $pivot, private readonly string $foreign_key, private readonly string $related_key, private readonly array $choices, private readonly string $choices_name)
    {
    }

    public function getPivot(): string
    {
        return $this->pivot;
    }

    public function getForeignKey(): string
    {
        return $this->foreign_key;
    }

    public function getRelatedKey(): string
    {
        return $this->related_key;
    }

    public function getChoices(): array
    {
        return $this->choices;
    }

    public function getChoicesName(): string
    {
        return $this->choices_name;
    }

    public function jsonSerialize(): mixed
    {
        return [
            'pivot' => $this->pivot,
            'foreign_key' => $this->foreign_key,
            'related_key' => $this->related_key,
            'choices' => $this->choices,
            'choices_name' => $this->choices_name,
        ];
    }
}
