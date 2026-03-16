<?php

namespace App\Http\Controllers\Staff\Documents;

use App\Eloquents\Document;
use App\Http\Controllers\Controller;
use Storage;

class ShowAction extends Controller
{
    public function __invoke(Document $document)
    {
        return response()->file(Storage::path($document->path));
    }
}
