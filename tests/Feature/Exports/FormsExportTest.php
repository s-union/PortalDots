<?php

declare(strict_types=1);

namespace Tests\Feature\Exports;

use App\Eloquents\Form;
use App\Eloquents\Tag;
use App\Eloquents\User;
use App\Exports\FormsExport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

final class FormsExportTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var FormsExport
     */
    private $formsExport;

    /**
     * @var Form
     */
    private $form;

    protected function setUp(): void
    {
        parent::setUp();

        $this->formsExport = App::make(FormsExport::class);

        $user = User::factory()->create();

        $this->form = Form::factory()->create([
            'name' => '場所登録申請',
            'max_answers' => 2,
        ]);

        $tag = Tag::factory()->create([
            'name' => '屋内',
        ]);
        $this->form->answerableTags()->attach($tag->id);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function map_フォーム情報のフォーマットが正常に行われる()
    {
        $this->assertEquals(
            [
                $this->form->id,
                '場所登録申請',
                $this->form->description,
                '屋内',
                $this->form->open_at,
                $this->form->close_at,
                2,
                'はい',
                $this->form->created_at,
                $this->form->updated_at,
            ],
            $this->formsExport->map(
                $this->form->load(['answerableTags'])
            )
        );
    }
}
