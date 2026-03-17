<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Services\Auth\EmailService;
use App\Services\Auth\RegisterService;
use App\Services\Auth\VerifyService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Foundation\Auth\RegistersUsers;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Mime\Exception\RfcComplianceException;

class RegisterController extends Controller
{
    use RegistersUsers;

    /*
    |--------------------------------------------------------------------------
    | Register Controller
    |--------------------------------------------------------------------------
    |
    | This controller handles the registration of new users as well as their
    | validation and creation. By default this controller uses a trait to
    | provide this functionality without requiring any additional code.
    |
    */

    /**
     * Where to redirect users after registration.
     *
     * @var string
     */
    protected $redirectTo = '/';

    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct(
        private RegisterService $registerService,
        private EmailService $emailService,
        private VerifyService $verifyService
    ) {
        $this->middleware('guest');
    }

    public function showRegistrationForm()
    {
        return view('users.register');
    }

    /**
     * ユーザー登録を実行する
     *
     * @return Response
     */
    public function register(RegisterRequest $request): RedirectResponse
    {
        DB::beginTransaction();

        $user = $this->registerService->create(
            $request->student_id,
            $request->name,
            $request->name_yomi,
            $request->email,
            $request->univemail_local_part,
            $request->univemail_domain_part,
            $request->tel,
            $request->password
        );

        event(new Registered($user));

        try {
            // メール認証に関する処理
            if ($user->univemail === $user->email) {
                $this->verifyService->markEmailAsVerified($user, $user->email);
            }
            $this->emailService->sendAll($user);
        } catch (RfcComplianceException) {
            DB::rollBack();

            return to_route('register')
                ->withInput()
                ->withErrors(['student_id' => config('portal.student_id_name') . 'を正しく入力してください']);
        }

        DB::commit();

        $this->guard()->login($user);

        // return $this->registered($request, $user)
        //     ?: redirect($this->redirectPath());
        return to_route('verification.notice');
    }
}
