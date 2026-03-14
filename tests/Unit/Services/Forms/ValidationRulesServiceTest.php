<?php

namespace Tests\Unit\Services\Forms;

use App\Eloquents\Form;
use App\Eloquents\Question;
use App\Services\Forms\ValidationRulesService;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;

class ValidationRulesServiceTest extends TestCase
{
    public function testMarkdownWithoutNumberMaxDoesNotApplyImplicitMaxRule(): void
    {
        $form = new Form();
        $question = new Question([
            'type' => 'markdown',
            'number_max' => null,
        ]);
        $question->id = 1;
        $form->setRelation('questions', collect([$question]));

        $service = new ValidationRulesService();

        $strict_rules = $service->getRulesFromForm($form, new Request(), true);
        $draft_rules = $service->getRulesFromForm($form, new Request(), false);

        $this->assertNotContains('max:1000', $strict_rules['answers.' . $question->id]);
        $this->assertSame(['nullable', 'string'], $draft_rules['answers.' . $question->id]);
    }

    public function testMarkdownExplicitNumberMaxIsAppliedOnlyForStrictValidation(): void
    {
        $form = new Form();
        $question = new Question([
            'type' => 'markdown',
            'number_max' => 1200,
        ]);
        $question->id = 1;
        $form->setRelation('questions', collect([$question]));

        $service = new ValidationRulesService();

        $strict_rules = $service->getRulesFromForm($form, new Request(), true);
        $draft_rules = $service->getRulesFromForm($form, new Request(), false);

        $this->assertContains('max:1200', $strict_rules['answers.' . $question->id]);
        $this->assertNotContains('max:1200', $draft_rules['answers.' . $question->id]);
    }
}
