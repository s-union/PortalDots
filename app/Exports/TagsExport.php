<?php

namespace App\Exports;

use App\Eloquents\Tag;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class TagsExport implements FromCollection, WithHeadings, WithMapping
{
    /**
    * @return \Illuminate\Support\Collection
    */
    public function collection()
    {
        return Tag::with('circles')->get();
    }

    /**
     * @param Tag $tag
     * @return array
     */
    public function map($tag): array
    {
        $firstCircle = $tag->circles->shift();
        $circles = [];

        foreach ($tag->circles as $circle) {
            $circles[] = [
                null,
                null,
                null,
                null,
                $circle->id,
                $circle->name,
                $circle->name_yomi,
            ];
        }

        return array_merge(
            [
                [
                    $tag->id,
                    $tag->name,
                    $tag->created_at,
                    $tag->updated_at,
                    $firstCircle->id ?? null,
                    $firstCircle->name ?? null,
                    $firstCircle->name_yomi ?? null,
                ]
            ],
            $circles
        );
    }

    /**
     * @return array
     */
    public function headings(): array
    {
        return [
            'タグID',
            'タグ',
            '作成日時',
            '更新日時',
            '企画ID',
            '団体名',
            '団体名（ふりがな）',
        ];
    }
}
