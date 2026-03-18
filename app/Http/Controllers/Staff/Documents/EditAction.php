<?php

namespace App\Http\Controllers\Staff\Documents;

use App\Eloquents\Document;
use App\Http\Controllers\Controller;

class EditAction extends Controller
{
    public function __invoke(Document $document)
    {
        return view('staff.documents.form')
            ->with('document', $document);
    }
}
