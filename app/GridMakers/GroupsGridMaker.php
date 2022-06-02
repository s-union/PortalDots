<?php

namespace App\GridMakers;

use App\Eloquents\Group;
use App\GridMakers\Concerns\UseEloquent;
use App\GridMakers\Filter\FilterableKey;
use App\GridMakers\Filter\FilterableKeysDict;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class GroupsGridMaker implements GridMakable
{
    use UseEloquent;

    /**
     * @inheritDoc
     */
    protected function baseEloquentQuery(): Builder
    {
        return Group::submitted()->select([
            'id',
            'group_name',
            'group_name_yomi',
            'submitted_at',
            'created_at',
            'updated_at'
        ]);
    }

    /**
     * @inheritDoc
     */
    public function keys(): array
    {
        return [
            'id',
            'group_name',
            'group_name_yomi',
            'submitted_at',
            'created_at',
            'updated_at'
        ];
    }

    /**
     * @inheritDoc
     */
    public function filterableKeys(): FilterableKeysDict
    {
        return new FilterableKeysDict([
            'id' => FilterableKey::number(),
            'group_name' => FilterableKey::string(),
            'group_name_yomi' => FilterableKey::string(),
            'submitted_at' => FilterableKey::datetime(),
            'created_at' => FilterableKey::datetime(),
            'updated_at' => FilterableKey::datetime()
        ]);
    }

    /**
     * @inheritDoc
     */
    public function sortableKeys(): array
    {
        return [
            'id',
            'group_name',
            'group_name_yomi',
            'submitted_at',
            'created_at',
            'updated_at'
        ];
    }

    /**
     * @inheritDoc
     */
    protected function map($record): array
    {
        $item = [];
        foreach ($this->keys() as $key) {
            switch ($key) {
                case 'created_at':
                case 'updated_at':
                case 'submitted_at':
                    $item[$key] = !empty($record->updated_at) ? $record->updated_at->format('Y/m/d H:i:s') : null;
                    break;
                default:
                    $item[$key] = $record->$key;
            }
        }
        return $item;
    }

    /**
     * @inheritDoc
     */
    protected function model(): Model
    {
        return new Group();
    }
}
