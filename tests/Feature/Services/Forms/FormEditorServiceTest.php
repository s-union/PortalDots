<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Forms;

use App\Eloquents\Form;
use App\Services\Forms\FormEditorService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

final class FormEditorServiceTest extends TestCase
{
    use RefreshDatabase;

    private FormEditorService $formEditorService;

    private Form $form;

    protected function setUp(): void
    {
        parent::setUp();

        $this->formEditorService = App::make(FormEditorService::class);
        $this->form = Form::factory()->create([
            'open_at' => new CarbonImmutable('2026-05-01 00:00:00'),
            'close_at' => new CarbonImmutable('2026-05-31 23:59:00'),
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function open_atとclose_atが渡された場合は受付期間を更新できる()
    {
        // 指定ありの場合は従来どおり受付期間を更新する
        $this->formEditorService->updateForm($this->form->id, [
            'open_at' => '2026-06-01 00:00:00',
            'close_at' => '2026-06-30 23:59:00',
        ]);

        $this->form->refresh();
        $this->assertSame('2026-06-01 00:00:00', $this->form->open_at->format('Y-m-d H:i:s'));
        $this->assertSame('2026-06-30 23:59:00', $this->form->close_at->format('Y-m-d H:i:s'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function open_atとclose_atが未指定の場合は受付期間を保持したまま更新できる()
    {
        // 指定なしの場合は受付期間を保持し、他項目のみ更新する
        $originalOpenAt = $this->form->open_at->copy();
        $originalCloseAt = $this->form->close_at->copy();

        $this->formEditorService->updateForm($this->form->id, [
            'name' => '更新後フォーム',
            'description' => '更新後説明',
            'is_public' => false,
            'max_answers' => 3,
        ]);

        $this->form->refresh();
        $this->assertSame('更新後フォーム', $this->form->name);
        $this->assertSame('更新後説明', $this->form->description);
        $this->assertFalse($this->form->is_public);
        $this->assertSame(3, $this->form->max_answers);
        $this->assertSame($originalOpenAt->format('Y-m-d H:i:s'), $this->form->open_at->format('Y-m-d H:i:s'));
        $this->assertSame($originalCloseAt->format('Y-m-d H:i:s'), $this->form->close_at->format('Y-m-d H:i:s'));
    }
}
