<?php

namespace App\Http\Controllers\Staff\Documents;

use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Documents\CreateDocumentRequest;
use App\Services\Documents\DocumentsService;

class StoreAction extends Controller
{
    public function __construct(private readonly DocumentsService $documentsService)
    {
    }

    public function __invoke(CreateDocumentRequest $request)
    {
        $validated = $request->validated();

        $this->documentsService->createDocument(
            $validated['name'],
            $validated['description'],
            $request->file('file'),
            (bool) $validated['is_public'],
            (bool) $validated['is_important'],
            $validated['notes']
        );

        return to_route('staff.documents.create')
            ->with('topAlert.title', '配布資料を作成しました');
    }
}
