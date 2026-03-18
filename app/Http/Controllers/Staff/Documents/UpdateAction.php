<?php

namespace App\Http\Controllers\Staff\Documents;

use App\Eloquents\Document;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Documents\UpdateDocumentRequest;
use App\Services\Documents\DocumentsService;

class UpdateAction extends Controller
{
    public function __construct(private readonly DocumentsService $documentsService)
    {
    }

    public function __invoke(UpdateDocumentRequest $request, Document $document)
    {
        $validated = $request->validated();

        $this->documentsService->updateDocument(
            $document,
            $validated['name'],
            $validated['description'],
            $request->file('file'),
            (bool) $validated['is_public'],
            (bool) $validated['is_important'],
            $validated['notes']
        );

        return back()
            ->with('topAlert.title', '配布資料を更新しました');
    }
}
