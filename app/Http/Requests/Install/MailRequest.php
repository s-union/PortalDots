<?php

namespace App\Http\Requests\Install;

use App;
use App\Services\Install\MailService;
use Illuminate\Foundation\Http\FormRequest;

class MailRequest extends FormRequest
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
    public function rules(MailService $mailService)
    {
        return $mailService->getValidationRules();
    }

    public function attributes()
    {
        $mailService = App::make(MailService::class);

        return $mailService->getFormLabels();
    }
}
