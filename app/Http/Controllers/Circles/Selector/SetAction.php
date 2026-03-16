<?php

namespace App\Http\Controllers\Circles\Selector;

use App\Eloquents\Circle;
use App\Http\Controllers\Controller;
use App\Services\Circles\SelectorService;
use Gate;
use Illuminate\Http\Request;
use Illuminate\Routing\Router;

class SetAction extends Controller
{
    public function __construct(private readonly Router $router, private readonly SelectorService $selectorService)
    {
    }

    public function __invoke(Request $request)
    {
        $redirect_to = $request->redirect_to;
        if (isset($redirect_to)) {
            $url = $this->getSanitizedUrl($redirect_to);
            $circle = Circle::approved()->findOrFail($request->circle);

            if (Gate::allows('circle.belongsTo', $circle)) {
                $this->selectorService->setCircle($circle);

                return redirect($url);
            }
        }

        abort(404);
    }

    private function getSanitizedUrl($url)
    {
        // $urlが「//evil.example.com/evil」のような文字列になっている場合、
        // PortalDots 外のページへリダイレクトしてしまう(オープンリダイレクト脆弱性)
        // のため、先頭にスラッシュがついている場合は取り除く。
        //
        // 先頭のスラッシュを取り除いた上で、スラッシュを1つだけ先頭に追加する。
        return '/'.str_replace("\n", '', preg_replace('/^\/+/', '', (string) $url));
    }
}
