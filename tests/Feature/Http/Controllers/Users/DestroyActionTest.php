<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Users;

use App\Eloquents\Circle;
use App\Eloquents\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class DestroyActionTest extends TestCase
{
    use RefreshDatabase;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function アカウント削除ができる()
    {
        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->delete(route('user.destroy'));

        $this->assertDatabaseMissing('users', [
            'id' => $this->user->id,
        ]);

        $response->assertRedirect(route('home'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 管理者ユーザーは削除できない()
    {
        $this->user->is_admin = true;
        $this->user->save();

        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
            'is_admin' => 1,
        ]);

        $response = $this->actingAs($this->user)
            ->delete(route('user.destroy'));

        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
            'is_admin' => 1,
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function スタッフユーザーは削除できない()
    {
        $this->user->is_staff = true;
        $this->user->save();

        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
            'is_staff' => 1,
        ]);

        $response = $this->actingAs($this->user)
            ->delete(route('user.destroy'));

        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
            'is_staff' => 1,
        ]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 企画に所属しているユーザーは削除できない()
    {
        $circle = Circle::factory()->create();
        $this->user->circles()->attach($circle->id);

        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->delete(route('user.destroy'));

        $this->assertDatabaseHas('users', [
            'id' => $this->user->id,
        ]);
    }
}
