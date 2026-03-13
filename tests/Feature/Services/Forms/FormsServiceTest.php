<?php

namespace Tests\Feature\Services\Forms;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Eloquents\Form;
use App\Eloquents\Question;
use App\Eloquents\User;
use App\Services\Forms\FormsService;
use Illuminate\Support\Facades\App;

class FormsServiceTest extends TestCase
{
    use RefreshDatabase;

    public function setUp(): void
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

    /**
     * @test
     */
    public function copyForm_申請の複製ができる()
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
