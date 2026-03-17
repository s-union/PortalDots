<?php

declare(strict_types=1);

namespace App\GridMakers;

use App\Eloquents\Tag;
use App\GridMakers\Concerns\UseEloquent;
use App\GridMakers\Filter\FilterableKey;
use App\GridMakers\Filter\FilterableKeysDict;
use App\Services\Utils\FormatTextService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class TagsGridMaker implements GridMakable
{
    use UseEloquent;

    public function __construct(private FormatTextService $formatTextService)
    {
    }

    /**
     * {@inheritDoc}
     */
    protected function baseEloquentQuery(): Builder
    {
        return Tag::select([
            'id',
            'name',
            'created_at',
            'updated_at',
        ]);
    }

    /**
     * {@inheritDoc}
     */
    public function keys(): array
    {
        return [
            'id',
            'name',
            'created_at',
            'updated_at',
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function filterableKeys(): FilterableKeysDict
    {
        return new FilterableKeysDict([
            'id' => FilterableKey::number(),
            'name' => FilterableKey::string(),
            'created_at' => FilterableKey::datetime(),
            'updated_at' => FilterableKey::datetime(),
        ]);
    }

    /**
     * {@inheritDoc}
     */
    public function sortableKeys(): array
    {
        return [
            'id',
            'name',
            'created_at',
            'updated_at',
        ];
    }

    /**
     * {@inheritDoc}
     */
    public function map($record): array
    {
        $item = [];
        foreach ($this->keys() as $key) {
            $item[$key] = match ($key) {
                'created_at' => ! empty($record->created_at) ? $record->created_at->format('Y/m/d H:i:s') : null,
                'updated_at' => ! empty($record->updated_at) ? $record->updated_at->format('Y/m/d H:i:s') : null,
                default => $record->$key,
            };
        }

        return $item;
    }

    protected function model(): Model
    {
        return new Tag();
    }
}
