<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Eloquents\User;
use Illuminate\Support\Facades\Auth;

class ChangeInfoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        $rules = User::getValidationRules();
        return [
            'student_id' => array_merge(
                User::STUDENT_ID_RULES,
                [Rule::unique('users')->ignore(Auth::user())]
            ),
            'name_family' => User::NAME_PART_RULES,
            'name_given' => User::NAME_PART_RULES,
            'name_family_yomi' => User::NAME_YOMI_PART_RULES,
            'name_given_yomi' => User::NAME_YOMI_PART_RULES,
            'email' => array_merge(User::EMAIL_RULES, [Rule::unique('users')->ignore(Auth::user())]),
            'univemail_local_part' => $rules['univemail_local_part'],
            'univemail_domain_part' => $rules['univemail_domain_part'],
            'tel' => User::TEL_RULES,
            'password' => array_merge(User::PASSWORD_RULES, [
                // 現在のパスワードが正しいものか検証する
                function ($attribute, $value, $fail) {
                    /** @var User $user */
                    $user = Auth::user();
                    if (! Auth::attempt(['login_id' => $user->email, 'password' => $value])) {
                        $fail('パスワードが違います。');
                    }
                }
            ]),
        ];
    }

    protected function prepareForValidation()
    {
        $nameFamily = trim((string) $this->input('name_family'));
        $nameGiven = trim((string) $this->input('name_given'));
        $nameFamilyYomi = trim((string) $this->input('name_family_yomi'));
        $nameGivenYomi = trim((string) $this->input('name_given_yomi'));

        $this->merge([
            'name_family' => $nameFamily,
            'name_given' => $nameGiven,
            'name' => trim($nameFamily . ' ' . $nameGiven),
            'name_family_yomi' => $nameFamilyYomi,
            'name_given_yomi' => $nameGivenYomi,
            'name_yomi' => trim($nameFamilyYomi . ' ' . $nameGivenYomi),
        ]);
    }

    public function attributes()
    {
        return [
            'student_id' => config('portal.student_id_name'),
            'name_family' => '姓',
            'name_given' => '名',
            'name_family_yomi' => '姓(よみ)',
            'name_given_yomi' => '名(よみ)',
            'email' => '連絡先メールアドレス',
            'tel' => '連絡先電話番号',
            'password' => 'パスワード',
        ];
    }

    public function messages()
    {
        return [
            'student_id.unique' => '入力された' . config('portal.student_id_name') . 'はすでに登録されています',
            'email.unique' => '入力されたメールアドレスはすでに登録されています',
            'name_family.regex' => '姓にスペースは入れられません',
            'name_given.regex' => '名にスペースは入れられません',
            'name_family_yomi.regex' => '姓(よみ)はひらがなで入力してください',
            'name_given_yomi.regex' => '名(よみ)はひらがなで入力してください',
        ];
    }

    public function withValidator($validator)
    {
        /** @var User */
        $user = Auth::user();
        $circles = $user->circles()->submitted()->get();

        $validator->after(function ($validator) use ($user, $circles) {
            if (
                !User::isValidUnivemailByLocalPartAndDomainPart(
                    $this->univemail_local_part,
                    $this->univemail_domain_part
                )
            ) {
                $validator->errors()->add('univemail', '不正なメールアドレスです。');
            }

            if (!$circles->isEmpty()) {
                if (!empty($this->name) && $this->name !== $user->name) {
                    $validator->errors()->add('name', '企画に所属しているため修正できません');
                }

                if (!empty($this->name_yomi) && $this->name_yomi !== $user->name_yomi) {
                    $validator->errors()->add('name_yomi', '企画に所属しているため修正できません');
                }

                if (!empty($this->student_id) && $this->student_id !== $user->student_id) {
                    $validator->errors()->add('student_id', '企画に所属しているため修正できません');
                }
            }
        });
    }
}
