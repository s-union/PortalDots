<?php

namespace App\Http\Controllers\Forms;

use App\Eloquents\Form;
use App\Http\Controllers\Controller;
use App\Services\Circles\SelectorService;
use Illuminate\Http\Request;

class IndexAction extends Controller
{
    public function __construct(private readonly SelectorService $selectorService)
    {
    }

    public function __invoke(Request $request)
    {
        $circle = $this->selectorService->getCircle();

        $forms = Form::byCircle($circle)->public()->withoutParticipationForms()->open()->closeOrder()->paginate(10);

        if (empty($this->selectorService->getCircle())) {
            // TODO: もうちょっとまともなエラー表示にする
            return to_route('home')
                ->with('topAlert.type', 'danger')
                ->with('topAlert.title', '企画に所属していないため、このページにアクセスできません');
        }

        if ($forms->currentPage() > $forms->lastPage()) {
            return redirect($forms->url($forms->lastPage()));
        }

        return view('forms.list')
            ->with('forms', $forms)
            ->with('circle', $this->selectorService->getCircle());
    }
}
