<?php

namespace App\Http\Requests\Auth;

use App\Eloquents\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @property-read string $student_id
 * @property-read string $name_family
 * @property-read string $name_given
 * @property-read string $name
 * @property-read string $name_family_yomi
 * @property-read string $name_given_yomi
 * @property-read string $name_yomi
 * @property-read string $email
 * @property-read string $univemail_local_part
 * @property-read string $univemail_domain_part
 * @property-read string $tel
 * @property-read string $password
 */
class RegisterRequest extends FormRequest
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
            'student_id' => array_merge($rules['student_id'], ['unique:users']),
            'name_family' => User::NAME_PART_RULES,
            'name_given' => User::NAME_PART_RULES,
            'name_family_yomi' => User::NAME_YOMI_PART_RULES,
            'name_given_yomi' => User::NAME_YOMI_PART_RULES,
            'email' => array_merge($rules['email'], ['unique:users']),
            'univemail_local_part' => $rules['univemail_local_part'],
            'univemail_domain_part' => $rules['univemail_domain_part'],
            'tel' => $rules['tel'],
            'password' => array_merge($rules['password'], ['confirmed']),
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

    /**
     * バリデーションエラーのカスタム属性の取得
     *
     * @return array
     */
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

    /**
     * バリデーションエラーメッセージ取得
     *
     * @return array
     */
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
        $validator->after(function ($validator) {
            if (
                !User::isValidUnivemailByLocalPartAndDomainPart(
                    $this->univemail_local_part,
                    $this->univemail_domain_part
                )
            ) {
                $validator->errors()->add('univemail', '不正なメールアドレスです。');
            }
        });
    }
}
