<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\Circles\CirclesService;
use App\Services\Groups\GroupsService;
use App\Services\Utils\DotenvService;
use Illuminate\Support\Facades\Auth;
use App\Eloquents\Page;
use App\Eloquents\Document;
use App\Eloquents\Form;
use App\Eloquents\CustomForm;
use App\Services\Circles\SelectorService;

class HomeAction extends Controller
{
    /**
     * 表示するお知らせ・配布資料の最大数
     */
    private const TAKE_COUNT = 5;

    /**
     * @var SelectorService
     */
    private $selectorService;

    /**
     * @var DotenvService
     */
    private $dotenvService;

    /**
     * @var GroupsService
     */
    private $groupsService;

    public function __construct(
        SelectorService $selectorService,
        DotenvService $dotenvService,
        GroupsService $groupsService
    ) {
        $this->selectorService = $selectorService;
        $this->dotenvService = $dotenvService;
        $this->groupsService = $groupsService;
    }

    public function __invoke()
    {
        $circle = $this->selectorService->getCircle();

        if (isset($circle)) {
            $circle->load('places');
        }

        $custom_form = CustomForm::getFormByType('circle');
        $can_register = isset($custom_form) && $custom_form->is_public && $custom_form->isOpen();
        $group = Auth::check() ? Auth::user()->groups()->first() : null;

        return view('home')
            ->with('circle_custom_form', $custom_form)
            ->with(
                'my_circles',
                Auth::check()
                    ? Auth::user()
                        ->circles()
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
                        }
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
                    ->withoutCustomForms()
                    ->closeOrder()
                    ->get()
            )
            ->with(
                'register_group_before_submitting_circle',
                $this->dotenvService->getValue(
                    'PORTAL_GROUP_REGISTER_BEFORE_SUBMITTING_CIRCLE',
                    'false'
                ) === 'true'
            )
            ->with(
                'my_group',
                $group
            )
            ->with('can_register', $can_register)
            ->with(
                'attendance_fee',
                Auth::check() ? $this->groupsService->attendanceFee(Auth::user()) : null
            )
            ->with(
                'attendance_type_description',
                Auth::check() ? $this->groupsService->attendanceTypeDescription(Auth::user()) : null
            );
    }
}
