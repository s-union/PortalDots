<?php

namespace App\Http\Controllers\Circles\Users;

use App\Eloquents\Circle;
use App\Http\Controllers\Controller;
use App\Services\Circles\CirclesService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StoreAction extends Controller
{
    public function __construct(private readonly CirclesService $circlesService)
    {
    }

    public function __invoke(Circle $circle, Request $request)
    {
        if ($circle->invitation_token !== $request->invitation_token) {
            abort(404);
        }

        $participationForm = $circle->participationType->form;

        $canJoin = isset($participationForm)
            && $participationForm->is_public
            && $participationForm->isOpen()
            && ! $circle->hasSubmitted();

        if (! $canJoin) {
            abort(404);
        }

        if ($circle->users->contains(Auth::user())) {
            return to_route('circles.show', ['circle' => $circle])
                ->with('topAlert.title', 'あなたは既にメンバーです');
        }

        activity()->disableLogging();
        $this->circlesService->addMember($circle, Auth::user());
        activity()->enableLogging();

        return to_route('circles.show', ['circle' => $circle])
            ->with('topAlert.title', "「{$circle->name}」の学園祭係(副責任者)になりました");
    }
}
