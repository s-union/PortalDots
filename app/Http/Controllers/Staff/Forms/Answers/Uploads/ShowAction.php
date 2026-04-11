<?php

namespace App\Http\Controllers\Staff\Forms\Answers\Uploads;

use Storage;
use App\Http\Controllers\Controller;
use App\Eloquents\Form;
use App\Eloquents\Answer;
use App\Eloquents\Question;
use App\Eloquents\AnswerDetail;

class ShowAction extends Controller
{
    public function __invoke(Form $form, Answer $answer, Question $question)
    {
        if (
            (int)$answer->form_id !== (int)$form->id ||
            (int)$question->form_id !== (int)$form->id ||
            $question->type !== 'upload'
        ) {
            abort(404);
        }

        $file_path = AnswerDetail::select('answer')
            ->where('answer_id', $answer->id)
            ->where('question_id', $question->id)
            ->firstOrFail();

        $path = $this->getSafeUploadPath($file_path->answer);

        return response()->file(Storage::path($path));
    }

    private function getSafeUploadPath(string $path): string
    {
        $normalized_path = ltrim(str_replace('\\', '/', $path), '/');

        if (
            strpos($normalized_path, 'answer_details/') !== 0 ||
            preg_match('#(^|/)\.\.(?:/|$)#', $normalized_path) === 1 ||
            !Storage::exists($normalized_path)
        ) {
            abort(404);
        }

        return $normalized_path;
    }
}
