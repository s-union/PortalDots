<?php

declare(strict_types=1);

namespace App\Services\Documents;

use App\Eloquents\Document;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class DocumentsService
{
    /**
     * 配布資料を作成する
     *
     * @param  bool  $is_public  公開するかどうか
     * @param  bool  $is_important  重要かどうか
     * @param  string|null  $notes  スタッフ用メモ
     */
    public function createDocument(
        string $name,
        ?string $description,
        UploadedFile $file,
        bool $is_public,
        bool $is_important,
        ?string $notes
    ): Document {
        $path = $file->store('documents');

        return Document::create([
            'name' => $name,
            'description' => $description,
            'path' => $path,
            'size' => $file->getSize(),
            'extension' => $file->getClientOriginalExtension(),
            'is_public' => $is_public,
            'is_important' => $is_important,
            'notes' => $notes,
        ]);
    }

    /**
     * 配布資料を更新する
     *
     *
     * @param  Document  $document  更新対象の配布資料
     * @param  bool  $is_public  公開するかどうか
     * @param  bool  $is_important  重要かどうか
     * @param  string|null  $notes  スタッフ用メモ
     */
    public function updateDocument(
        Document $document,
        string $name,
        ?string $description,
        ?UploadedFile $file,
        bool $is_public,
        bool $is_important,
        ?string $notes
    ): bool {
        if (! empty($file)) {
            Storage::delete($document->path);
        }

        return $document->update([
            'name' => $name,
            'description' => $description,
            'path' => empty($file) ? $document->path : $file->store('documents'),
            'size' => empty($file) ? $document->size : $file->getSize(),
            'extension' => empty($file) ? $document->extension : $file->getClientOriginalExtension(),
            'is_public' => $is_public,
            'is_important' => $is_important,
            'notes' => $notes,
        ]);
    }

    /**
     * 配布資料を削除する
     */
    public function deleteDocument(Document $document): bool
    {
        Storage::delete($document->path);

        return $document->delete();
    }
}
