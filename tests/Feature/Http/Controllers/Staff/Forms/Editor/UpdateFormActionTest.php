<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Forms\Editor;

use App\Eloquents\Form;
use App\Eloquents\Permission;
use App\Eloquents\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class UpdateFormActionTest extends TestCase
{
    use RefreshDatabase;

    private Form $form;

    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->form = Form::factory()->create([
            'name' => '更新前フォーム',
            'description' => '更新前説明',
            'open_at' => new CarbonImmutable('2026-04-01 00:00:00'),
            'close_at' => new CarbonImmutable('2026-04-30 23:59:00'),
            'max_answers' => 1,
            'is_public' => true,
        ]);
        $this->staff = User::factory()->staff()->create();
        Permission::create(['name' => 'staff.forms.edit']);
        $this->staff->syncPermissions(['staff.forms.edit']);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function フォームエディタ更新時に受付期間が意図せず変更されない()
    {
        $originalOpenAt = $this->form->open_at->copy();
        $originalCloseAt = $this->form->close_at->copy();

        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->post(route('staff.forms.editor.api', ['form' => $this->form]) . '/update_form', [
                'form' => [
                    'id' => $this->form->id,
                    'name' => '更新後フォーム',
                    'description' => '更新後説明',
                    'is_public' => false,
                    'max_answers' => 3,
                    // editor API が返しがちな UTC 文字列を敢えて混入させる
                    'open_at' => $originalOpenAt->copy()->utc()->format('Y-m-d\TH:i:s.u\Z'),
                    'close_at' => $originalCloseAt->copy()->utc()->format('Y-m-d\TH:i:s.u\Z'),
                ],
            ]);

        $response->assertStatus(200);

        $this->form->refresh();
        $this->assertSame('更新後フォーム', $this->form->name);
        $this->assertSame('更新後説明', $this->form->description);
        $this->assertFalse($this->form->is_public);
        $this->assertSame(3, $this->form->max_answers);
        $this->assertSame($originalOpenAt->format('Y-m-d H:i:s'), $this->form->open_at->format('Y-m-d H:i:s'));
        $this->assertSame($originalCloseAt->format('Y-m-d H:i:s'), $this->form->close_at->format('Y-m-d H:i:s'));
    }
}
