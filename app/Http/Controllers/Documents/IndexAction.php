<?php

namespace App\Http\Controllers\Documents;

use App\Eloquents\Document;
use App\Http\Controllers\Controller;

class IndexAction extends Controller
{
    public function __invoke()
    {
        $documents = Document::public()->paginate(10);

        if ($documents->currentPage() > $documents->lastPage()) {
            return redirect($documents->url($documents->lastPage()));
        }

        return view('documents.index')
            ->with('documents', $documents);
    }
}
