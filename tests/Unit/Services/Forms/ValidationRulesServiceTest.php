<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Forms;

use App\Eloquents\Form;
use App\Eloquents\Question;
use App\Services\Forms\ValidationRulesService;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;

final class ValidationRulesServiceTest extends TestCase
{
    #[\PHPUnit\Framework\Attributes\Test]
    public function markdown項目で最大文字数が未指定の場合に暗黙の最大文字数制限が適用されない(): void
    {
        // フォームと、最大文字数制限(number_max)を持たないMarkdown形式の設問を作成する
        $form = new Form;
        $question = new Question([
            'type' => 'markdown',
            'number_max' => null,
        ]);
        $question->id = 1;
        $form->setRelation('questions', collect([$question]));

        $service = new ValidationRulesService;

        // $strict=true は「本提出時」、$strict=false は「下書き保存時」を想定
        $strict_rules = $service->getRulesFromForm($form, new Request, true);
        $draft_rules = $service->getRulesFromForm($form, new Request, false);

        // textなどの他の型にデフォルトで付く max:1000 が、Markdown型には付与されないことを確認
        $this->assertNotContains('max:1000', $strict_rules['answers.'.$question->id]);

        // 下書き保存時のルールは最低限(nullable, stringのみ)であることを確認
        $this->assertSame(['nullable', 'string'], $draft_rules['answers.'.$question->id]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function markdown項目で明示的に最大文字数を指定した場合_厳密なバリデーション時のみ最大文字数制限が適用される(): void
    {
        // フォームと、最大文字数を「1200」に明示的に設定したMarkdown形式の設問を作成する
        $form = new Form;
        $question = new Question([
            'type' => 'markdown',
            'number_max' => 1200,
        ]);
        $question->id = 1;
        $form->setRelation('questions', collect([$question]));

        $service = new ValidationRulesService;

        $strict_rules = $service->getRulesFromForm($form, new Request, true);
        $draft_rules = $service->getRulesFromForm($form, new Request, false);

        // 本提出時(strict=true)は、設定した max:1200 のルールが強制されることを確認
        $this->assertContains('max:1200', $strict_rules['answers.'.$question->id]);

        // 下書き保存時(strict=false)は、文字数オーバーでも保存できるように max ルールが除外されることを確認
        $this->assertNotContains('max:1200', $draft_rules['answers.'.$question->id]);
    }
}
