<?php

namespace App\Http\Requests\Circles;

use App\Http\Requests\Forms\AnswerRequestInterface;
use App\Services\Forms\ValidationRulesService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CircleWithGroupRequest extends FormRequest implements AnswerRequestInterface
{
    public function rules(): array
    {
        return [
            'answer-food' => ['required', Rule::in(['はい', 'いいえ'])],
            'answer-food-booth' => ['required_if:answer-food,"はい"', 'numeric', 'min:1'],
            'answer-seller' => ['required', Rule::in(['はい', 'いいえ'])],
            'answer-seller-booth' => ['required_if:answer-seller,"はい"', 'numeric', 'min:1'],
            'answer-exh-seller' => ['required', Rule::in(['はい', 'いいえ'])],
            'answer-exh-seller-booth' => ['required_if:answer-exh-seller,"はい"', 'numeric', 'min:1'],
            'answer-exh' => ['required', Rule::in(['はい', 'いいえ'])],
            'answer-exh-booth' => ['required_if:answer-exh,"はい"', 'numeric', 'min:1'],
        ];
    }

    public function authorize(): bool
    {
        return true;
    }

    public function attributes()
    {
        return [
            'answer-food' => '飲食販売に参加するか',
            'answer-food-booth' => '飲食販売のブース数',
            'answer-seller' => '物品販売に参加するか',
            'answer-seller-booth' => '物品販売のブース数',
            'answer-exh-seller' => '展示・実演(収入あり)に参加するか',
            'answer-exh-seller-booth' => '展示・実演(収入あり)のブース数',
            'answer-exh' => '展示・実演(収入なし)に参加するか',
            'answer-exh-booth' => '展示・実演(収入なし)のブース数'
        ];
    }
}
