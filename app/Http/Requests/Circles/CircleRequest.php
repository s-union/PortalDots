<?php

namespace App\Http\Requests\Circles;

use App;
use App\Consts\CircleConsts;
use App\Eloquents\Circle;
use App\Eloquents\CustomForm;
use App\Services\Utils\DotenvService;
use Illuminate\Foundation\Http\FormRequest;
use App\Services\Forms\ValidationRulesService;
use App\Http\Requests\Forms\AnswerRequestInterface;
use Illuminate\Validation\Rule;

class CircleRequest extends FormRequest implements AnswerRequestInterface
{
    /**
     * @var DotenvService
     */
    private $dotenvService;

    public function __construct(DotenvService $dotenvService)
    {
        $this->dotenvService = $dotenvService;
    }

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
    public function rules(ValidationRulesService $validationRulesService)
    {
        $should_register_group =
            $this->dotenvService->getValue(
                'PORTAL_GROUP_REGISTER_BEFORE_SUBMITTING_CIRCLE',
                'false'
            ) === 'true';

        if ($should_register_group) {
            $rules = [
                'name' => Circle::NAME_RULES,
                'name_yomi' => Circle::NAME_YOMI_RULES,
                'answer_attendance_type' => ['required', Rule::in(CircleConsts::CIRCLE_ATTENDANCE_TYPES_V1)]
            ];
        } else {
            $rules = [
                'name' => Circle::NAME_RULES,
                'name_yomi' => Circle::NAME_YOMI_RULES,
                'group_name' => Circle::GROUP_NAME_RULES,
                'group_name_yomi' => Circle::GROUP_NAME_YOMI_RULES,
            ];
        }

        $custom_form_rules = $validationRulesService->getRulesFromForm(
            CustomForm::getFormByType('circle'),
            $this
        );

        return \array_merge($rules, $custom_form_rules);
    }

    /**
     * バリデーションエラーのカスタム属性の取得
     *
     * @return array
     */
    public function attributes()
    {
        $attributes = [
            'name' => '企画名',
            'name_yomi' => '企画名(よみ)',
            'group_name' => '企画を出店する団体の名称',
            'group_name_yomi' => '企画を出店する団体の名称(よみ)',
            'answer_attendance_type' => '企画の参加形態'
        ];

        $validationRulesService = App::make(ValidationRulesService::class);
        $custom_form_attributes = $validationRulesService->getAttributesFromForm(
            CustomForm::getFormByType('circle')
        )->toArray();

        return \array_merge($attributes, $custom_form_attributes);
    }

    /**
     * バリデーションエラーメッセージ取得
     *
     * @return array
     */
    public function messages()
    {
        return [
            'name_yomi.regex' => 'ひらがなで入力してください',
            'group_name_yomi.regex' => 'ひらがなで入力してください',
            // ひらがなもカタカナも入力可能だが，説明が面倒なので，エラー上ではひらがなでの入力を促す
        ];
    }
}
