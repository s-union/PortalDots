<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\StaffAuthService;
use App\Services\Circles\SelectorService;
use Illuminate\Foundation\Auth\AuthenticatesUsers;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class LoginController extends Controller
{
    use AuthenticatesUsers;

    /*
    |--------------------------------------------------------------------------
    | Login Controller
    |--------------------------------------------------------------------------
    |
    | This controller handles authenticating users for the application and
    | redirecting them to your home screen. The controller uses a trait
    | to conveniently provide its functionality to your applications.
    |
    */

    /**
     * Where to redirect users after login.
     *
     * @var string
     */
    protected $redirectTo = '/';

    public function username()
    {
        return 'login_id';
    }

    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct(private SelectorService $selectorService, private StaffAuthService $staffAuthService)
    {
        $this->middleware('guest')->except('logout', 'showLogout');
    }

    /**
     * ログインページに GET リクエストされた場合
     *
     * @return Response
     */
    public function showLoginForm()
    {
        return view('auth.login');
    }

    /**
     * ログアウトページに GET リクエストされた場合
     *
     * @return Response
     */
    public function showLogout()
    {
        return view('auth.logout');
    }

    /**
     * The user has logged out of the application.
     *
     * @return mixed
     */
    protected function loggedOut(Request $request)
    {
        // スタッフモードの二段階認証状態を解除する
        $this->staffAuthService->forget();

        // 選択中の企画からもログアウトする
        $this->selectorService->reset();
    }
}
