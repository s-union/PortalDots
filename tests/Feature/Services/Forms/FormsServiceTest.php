<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Forms;

use App\Eloquents\Form;
use App\Eloquents\Question;
use App\Eloquents\User;
use App\Services\Forms\FormsService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

final class FormsServiceTest extends TestCase
{
    use RefreshDatabase;

    private FormsService $formsService;

    private User $user;

    private Form $form;

    /** @var Collection<int, Question> */
    private Collection $questions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->formsService = App::make(FormsService::class);
        $this->user = User::factory()->create();
        $this->form = Form::factory()->create([
            'name' => 'テスト申請',
            'is_public' => true,
        ]);
        $this->questions = Question::factory(10)->create([
            'form_id' => $this->form->id,
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function copy_form_申請の複製ができる()
    {
        $form = $this->formsService->copyForm($this->form);

        $this->assertInstanceOf(Form::class, $form);

        $this->assertDatabaseHas('forms', [
            'name' => 'テスト申請のコピー',
            'is_public' => false,
        ]);

        foreach ($this->questions as $q) {
            $this->assertDatabaseHas('questions', [
                'form_id' => $form->id,
                'name' => $q->name,
                'description' => $q->description,
                'type' => $q->type,
                'is_required' => $q->is_required,
                'number_min' => $q->number_min,
                'number_max' => $q->number_max,
                'allowed_types' => $q->allowed_types,
                'options' => $q->options,
                'priority' => $q->priority,
            ]);
        }
    }
}
