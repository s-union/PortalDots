<?php

declare(strict_types=1);

namespace App\Http\Controllers\Staff\Pages;

use App\Eloquents\Page;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Pages\PatchPinRequest;
use App\Services\Pages\PagesService;

class PatchPinAction extends Controller
{
    public function __construct(private readonly PagesService $pagesService)
    {
    }

    public function __invoke(PatchPinRequest $request, Page $page)
    {
        $values = $request->validated();
        $isPinned = (bool) $values['is_pinned'];

        $this->pagesService->setPinStatusForPage($page, $isPinned);

        return to_route('staff.pages.index')
            ->with('topAlert.title', $isPinned ? 'お知らせを固定表示しました' : 'お知らせの固定表示を解除しました');
    }
}
