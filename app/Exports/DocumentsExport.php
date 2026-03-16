<?php

namespace App\Exports;

use App\Eloquents\Document;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class DocumentsExport implements FromCollection, WithHeadings, WithMapping
{
    /**
     * @return Collection
     */
    public function collection()
    {
        return Document::get();
    }

    /**
     * @param  Document  $document
     */
    public function map($document): array
    {
        return [
            $document->id,
            $document->name,
            preg_replace('/^documents\//', '', $document->path),
            $document->size,
            $document->extension,
            $document->description,
            $document->is_public ? 'はい' : 'いいえ',
            $document->is_important ? 'はい' : 'いいえ',
            $document->notes,
            $document->created_at,
            $document->updated_at,
        ];
    }

    public function headings(): array
    {
        return [
            '配布資料ID',
            '配布資料名',
            'ファイル名',
            'サイズ（バイト）',
            'ファイル形式',
            '説明',
            '公開',
            '重要',
            'スタッフ用メモ',
            '作成日時',
            '更新日時',
        ];
    }
}
