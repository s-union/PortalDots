<?php

declare(strict_types=1);

namespace App\Services\Forms;

use App\Eloquents\Option;
use DB;
use App\Eloquents\Form;
use App\Eloquents\Question;

class QuestionsService
{
    private $answerDetailsService;

    public function __construct(AnswerDetailsService $answerDetailsService)
    {
        $this->answerDetailsService = $answerDetailsService;
    }

    /**
     * 設問を追加する
     *
     * @param Form $form 設問を追加する対象のフォーム
     * @param string $type 設問タイプ
     * @return Question
     * @throws \Exception
     */
    public function addQuestion(Form $form, string $type): Question
    {
        if (!in_array($type, Question::QUESTION_TYPES, true)) {
            throw new \Exception('無効な設問タイプです');
        }
        // 適切なpriorityを設定するために、最もpriorityの値が大きい設問を取得する
        $question_max_priority = Question::select('priority')->orderBy('priority', 'desc')->first();
        $max_priority = is_object($question_max_priority) ? (int)$question_max_priority->priority : 0;
        /** @var Question $question */
        $question = $form->questions()->create([
            'type' => $type,
            'priority' => $max_priority + 1,
        ]);
        return $question;
    }

    /**
     * 設問順序を更新する
     *
     * @param Form $form 変更したい設問が含まれているフォーム
     * @param array $priorities キーが設問IDで値がpriorityの配列
     */
    public function updateQuestionsOrder(Form $form, array $priorities)
    {
        foreach ($priorities as $question_id => $priority) {
            Question::where('id', $question_id)->where('form_id', $form->id)->update(['priority' => $priority]);
        }
    }

    /**
     * 設問を更新する
     *
     * @param int $question_id 設問ID
     * @param array $question 設問配列
     */
    public function updateQuestion(int $question_id, array $question)
    {
        /* @var $eloquent Question */
        $eloquent = Question::findOrFail($question_id);
        if (empty($question['is_required'])) {
            $question['is_required'] = false;
        }

        // TODO: Remove this
        if (
            !empty($question['options'])
            &&
            // 選択肢を保存すべき問題タイプであった場合
            in_array($eloquent->type, Question::SHOULD_SAVE_OPTIONS_QUESTION_TYPES, true)
        ) {
            $options = array_unique(
                array_map(
                    'trim',
                    explode("\n", $question['options'])
                )
            );
            $question['options'] = implode("\n", $options);
        } else {
            $question['options'] = null;
        }

        $eloquent->fill($question);
        $eloquent->save();

        $eloquent->eloquentOptions()->delete();
        if (
            !empty($question['options'])
            &&
            // 選択肢を保存すべき問題タイプであった場合
            in_array($eloquent->type, Question::SHOULD_SAVE_OPTIONS_QUESTION_TYPES, true)
        ) {
            // この時点で、$question['options'] は重複が取り除かれ,各要素が改行で区切られた選択肢になっている.
            $array_options_without_duplication = explode("\n", $question['options']);

            // TODO: 切り出す？
            $eloquent->eloquentOptions()->createMany(
                array_map(function ($_, $value) {
                    return [
                        'name' => $value
                    ];
                },
                    array_keys($array_options_without_duplication),
                    array_values($array_options_without_duplication))
            );
        }
    }

    /**
     * 設問を削除する
     *
     * @param int $question_id 設問ID
     */
    public function deleteQuestion(int $question_id)
    {
        DB::transaction(function () use ($question_id) {
            /* @var $eloquent Question */
            $eloquent = Question::findOrFail($question_id);
            $eloquent->delete();
            $eloquent->eloquentOptions()->delete();
            $this->answerDetailsService->deleteAnswerDetailsByQuestionId($question_id);
        });
    }
}
