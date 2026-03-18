<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Forms;

use App\Eloquents\Form;
use App\Eloquents\Permission;
use App\Eloquents\User;
use App\Services\Forms\FormsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

final class CopyActionTest extends TestCase
{
    use RefreshDatabase;

    /** @var Form */
    private $form;

    /** @var Form */
    private $form_copy;

    /** @var User */
    private $staff;

    protected function setUp(): void
    {
        parent::setUp();
        $this->form = Form::factory()->create();
        $this->form_copy = Form::factory()->create();
        $this->staff = User::factory()->staff()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function forms_serviceのcopy_formが呼び出される()
    {
        Permission::create(['name' => 'staff.forms.duplicate']);
        $this->staff->syncPermissions(['staff.forms.duplicate']);

        $this->mock(FormsService::class, function ($mock) {
            $mock->shouldReceive('copyForm')->once()->with(Mockery::on(fn($arg) => $this->form->id === $arg->id && $this->form->name === $arg->name))->andReturn($this->form_copy);
        });

        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->post(route('staff.forms.copy', ['form' => $this->form]));

        $response->assertRedirect(route('staff.forms.index'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合はフォームを複製できない()
    {
        $response = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->post(route('staff.forms.copy', ['form' => $this->form]));

        $response->assertForbidden();
    }
}
