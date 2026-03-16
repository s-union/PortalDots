<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Circles;

use App\Eloquents\Permission;
use App\Eloquents\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CreateActionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var User
     */
    private $staff;

    protected function setUp(): void
    {
        parent::setUp();
        $this->staff = User::factory()->staff()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 企画の新規作成フォームが表示される()
    {
        Permission::create(['name' => 'staff.circles.edit']);
        $this->staff->syncPermissions('staff.circles.edit');

        $responce = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(
                route('staff.circles.create')
            );

        $responce->assertOk();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合は企画の新規作成フォームが表示されない()
    {
        $responce = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->get(
                route('staff.circles.create')
            );

        $responce->assertForbidden();
    }
}
