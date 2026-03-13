<?php

namespace App\Http\Requests\Install;

use Illuminate\Foundation\Http\FormRequest;
use App\Eloquents\User;

class AdminRequest extends FormRequest
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

        // このバリデーションが実行されるタイミングでは、まだマイグレーション
        // が行われていない。そのため、ここでは unique ルールなど、
        // データベースへの接続が必要なルールを追加しないこと。
        return [
            'student_id' => User::STUDENT_ID_RULES,
            'name_family' => User::NAME_PART_RULES,
            'name_given' => User::NAME_PART_RULES,
            'name_family_yomi' => User::NAME_YOMI_PART_RULES,
            'name_given_yomi' => User::NAME_YOMI_PART_RULES,
            'email' => User::EMAIL_RULES,
            'univemail_local_part' => $rules['univemail_local_part'],
            'univemail_domain_part' => $rules['univemail_domain_part'],
            'tel' => User::TEL_RULES,
            'password' => array_merge(User::PASSWORD_RULES, ['confirmed']),
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
