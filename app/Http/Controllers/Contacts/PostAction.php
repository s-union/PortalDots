<?php

namespace App\Http\Controllers\Contacts;

use App\Eloquents\Circle;
use App\Eloquents\ContactCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\ContactFormRequest;
use App\Services\Contacts\ContactsService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\HtmlString;

class PostAction extends Controller
{
    public function __construct(private readonly ContactsService $contactsService)
    {
    }

    public function __invoke(ContactFormRequest $request)
    {
        // ユーザーが企画に所属しているかどうかの検証は
        // ContactFormRequest で行っている
        $circle = ! empty($request->circle_id) ? Circle::find($request->circle_id) : null;
        $sender = Auth::user();
        $category =
            ContactCategory::find($request->category) ??
            new ContactCategory([
                'email' => config('portal.contact_email'),
                'name' => config('portal.admin_name'),
            ]);

        // チェックボックス未送信時も既定で共有ONにする（フォーム初期値と合わせる）
        $this->contactsService->create($circle, $sender, $request->contact_body, $category, $request->boolean('cc_subleader', true));

        return to_route('contacts')
            ->with('topAlert.title', 'お問い合わせを受け付けました。')
            ->with('topAlert.body', new HtmlString(nl2br(e($request->contact_body))));
    }
}
