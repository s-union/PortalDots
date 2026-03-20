<?php

declare(strict_types=1);

namespace App\Services\Forms;

use App\Eloquents\Form;
use Carbon\Carbon;

class FormEditorService
{
    /**
     * フォームを更新する
     *
     * @param  int  $form_id  フォームID
     * @param  array  $form  フォーム情報配列
     * @return void
     */
    public function updateForm(int $form_id, array $form): void
    {
        $eloquent = Form::findOrFail($form_id);

        if (array_key_exists('open_at', $form)) {
            $form['open_at'] = new Carbon($form['open_at']);
        }

        if (array_key_exists('close_at', $form)) {
            $form['close_at'] = new Carbon($form['close_at']);
        }

        $eloquent->fill($form);
        $eloquent->save();
    }
}
