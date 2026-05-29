<?php

namespace App\Http\Controllers\Documents;

use App\Eloquents\Document;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class ShowAction extends Controller
{
    // documents.id (MySQL INT UNSIGNED) の現実的な最大値
    private const MAX_DOCUMENT_ID = 4294967295;

    public function __invoke(string $document)
    {
        // URLパラメータが数値IDでない場合は不正アクセスとして404にする
        if (! ctype_digit($document)) {
            abort(404);

            return;
        }

        // 極端に大きいIDは早期に404として扱い、不要な処理を避ける
        $normalized_document = ltrim($document, '0');
        if ($normalized_document === '') {
            $normalized_document = '0';
        }
        $max_document_id = (string) self::MAX_DOCUMENT_ID;
        if (
            strlen($normalized_document) > strlen($max_document_id) ||
            (strlen($normalized_document) === strlen($max_document_id) &&
                strcmp($normalized_document, $max_document_id) > 0)
        ) {
            abort(404);

            return;
        }

        $document_id = (int) $normalized_document;
        $cache_key = Document::publicCacheKey($document_id);

        // 公開資料のみを永続キャッシュする（非公開/不存在はキャッシュしない）
        $public_document = Cache::get($cache_key);
        if (empty($public_document)) {
            $document = Document::query()
                ->select(['id', 'path'])
                ->public()
                ->find($document_id);
            if (empty($document)) {
                abort(404);

                return;
            }

            $public_document = [
                'path' => $document->path,
            ];
            Cache::forever($cache_key, $public_document);
        }

        if (empty($public_document['path'])) {
            abort(404);

            return;
        }

        // DB上の情報が残っていても実ファイルが無ければ404を返す
        if (! Storage::exists($public_document['path'])) {
            abort(404);

            return;
        }

        return response()->file(Storage::path($public_document['path']));
    }
}
