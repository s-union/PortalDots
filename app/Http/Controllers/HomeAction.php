<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Eloquents\Document;
use App\Eloquents\Form;
use App\Eloquents\Page;
use App\Eloquents\ParticipationType;
use App\Services\Circles\SelectorService;
use Illuminate\Support\Facades\Auth;

class HomeAction extends Controller
{
    /**
     * 表示するお知らせ・配布資料の最大数
     */
    private const TAKE_COUNT = 5;

    public function __construct(private readonly SelectorService $selectorService)
    {
    }

    public function __invoke()
    {
        $circle = $this->selectorService->getCircle();

        if (isset($circle)) {
            $circle->loadMissing(['places', 'participationType']);
        }

        return view('home')
            ->with('participation_types', ParticipationType::open()->public()->get())
            ->with(
                'my_circles',
                Auth::check()
                    ? Auth::user()
                        ->circles()
                        ->with(['participationType', 'participationType.form'])
                        ->get()
                    : collect([])
            )
            ->with('circle', $circle)
            ->with(
                'pinned_pages',
                Page::byCircle($circle)
                    ->with([
                        'documents' => function ($query) {
                            $query->public();
                        },
                    ])
                    ->public()
                    ->pinned()
                    ->get()
            )
            ->with(
                'pages',
                Page::byCircle($circle)
                    ->take(self::TAKE_COUNT)
                    ->with([
                        'usersWhoRead' => function ($query) {
                            $query->where('user_id', Auth::id());
                        },
                    ])
                    ->public()
                    ->pinned(false)
                    ->get()
            )
            ->with(
                'documents',
                Document::take(self::TAKE_COUNT)
                    ->public()
                    ->get()
            )
            ->with(
                'forms',
                Form::byCircle($circle)
                    ->take(self::TAKE_COUNT)
                    ->public()
                    ->open()
                    ->withoutParticipationForms()
                    ->closeOrder()
                    ->get()
            );
    }
}
