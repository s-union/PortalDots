<?php

namespace App\Http\Controllers\Documents;

use App\Eloquents\Document;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class ShowAction extends Controller
{
    public function __invoke(string $document)
    {
        // URLパラメータが数値IDでない場合は不正アクセスとして404にする
        if (! ctype_digit($document)) {
            abort(404);

            return;
        }

        $document_id = (int) $document;
        $cache_key = Document::publicCacheKey($document_id);

        // 公開済み配布資料の最小情報をキャッシュし、DBアクセス回数を削減する
        $public_document = Cache::rememberForever($cache_key, function () use ($document_id) {
            $document = Document::query()
                ->select(['id', 'path'])
                ->public()
                ->find($document_id);

            // 非公開または存在しない資料は「非公開扱い」の結果をキャッシュする
            if (empty($document)) {
                return ['is_public' => false];
            }

            return [
                'is_public' => true,
                'path' => $document->path,
            ];
        });

        // 公開資料として扱えない場合は詳細を返さず404にする
        if (! ($public_document['is_public'] ?? false) || empty($public_document['path'])) {
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
