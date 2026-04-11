<?php

namespace App\Http\Controllers\Documents;

use Storage;
use App\Http\Controllers\Controller;
use App\Eloquents\Document;

class ShowAction extends Controller
{
    public function __invoke(Document $document)
    {
        if (!$document->is_public) {
            abort(404);
            return;
        }

        $path = $this->getSafeDocumentPath($document->path);

        return response()->file(Storage::path($path));
    }

    private function getSafeDocumentPath(string $path): string
    {
        $normalized_path = ltrim(str_replace('\\', '/', $path), '/');

        if (
            strpos($normalized_path, 'documents/') !== 0 ||
            preg_match('#(^|/)\.\.(?:/|$)#', $normalized_path) === 1 ||
            !Storage::exists($normalized_path)
        ) {
            abort(404);
        }

        return $normalized_path;
    }
}
