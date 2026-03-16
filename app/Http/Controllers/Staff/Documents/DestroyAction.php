<?php

namespace App\Http\Controllers\Staff\Documents;

use App\Eloquents\Document;
use App\Http\Controllers\Controller;
use App\Services\Documents\DocumentsService;

class DestroyAction extends Controller
{
    /**
     * @var DocumentsService
     */
    private $documentsService;

    public function __construct(DocumentsService $documentsService)
    {
        $this->documentsService = $documentsService;
    }

    public function __invoke(Document $document)
    {
        $this->documentsService->deleteDocument($document);

        return redirect()
            ->route('staff.documents.index')
            ->with('topAlert.title', '配布資料を削除しました');
    }
}
