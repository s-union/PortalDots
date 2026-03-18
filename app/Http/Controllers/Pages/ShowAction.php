<?php

namespace App\Http\Controllers\Pages;

use App\Eloquents\Page;
use App\Http\Controllers\Controller;
use App\Services\Circles\SelectorService;
use App\Services\Pages\ReadsService;
use Illuminate\Support\Facades\Auth;

class ShowAction extends Controller
{
    public function __construct(private readonly SelectorService $selectorService, private readonly ReadsService $readsService)
    {
    }

    public function __invoke(Page $page)
    {
        $this->authorize('view', [$page, $this->selectorService->getCircle()]);

        if (Auth::check()) {
            $this->readsService->markAsRead($page, Auth::user());
        }

        $page->loadMissing(['documents' => function ($query) {
            $query->public();
        }]);

        return view('pages.show')
            ->with('page', $page);
    }
}
