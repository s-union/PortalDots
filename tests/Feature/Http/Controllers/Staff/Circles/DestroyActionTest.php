<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Staff\Circles;

use App\Eloquents\Answer;
use App\Eloquents\Circle;
use App\Eloquents\Form;
use App\Eloquents\Permission;
use App\Eloquents\Place;
use App\Eloquents\Tag;
use App\Eloquents\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class DestroyActionTest extends TestCase
{
    use RefreshDatabase;

    /** @var User */
    private $staff;

    /** @var Circle */
    private $circle;

    /** @var Form */
    private $form;

    protected function setUp(): void
    {
        parent::setUp();

        $this->staff = User::factory()->staff()->create();

        $user = User::factory()->create();
        $this->circle = Circle::factory()->create();

        $place = Place::factory()->create();

        $this->form = Form::factory()->create();
        $answer = Answer::factory()->create([
            'form_id' => $this->form->id,
            'circle_id' => $this->circle->id,
        ]);

        $tag = Tag::factory()->create();

        $user->circles()->attach($this->circle->id, ['is_leader' => true]);
        $this->circle->places()->attach($place->id);
        $this->circle->tags()->attach($tag->id);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 企画を削除すると関連する情報も削除される()
    {
        Permission::create(['name' => 'staff.circles.delete']);
        $this->staff->syncPermissions(['staff.circles.delete']);

        $responce = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->delete(route('staff.circles.destroy', ['circle' => $this->circle]));

        $responce->assertRedirect(route('staff.circles.participation_types.index', [
            'participation_type' => $this->circle->participationType,
        ]));

        $this->assertDatabaseMissing('answers', ['form_id' => $this->form->id, 'circle_id' => $this->circle->id]);
        $this->assertDatabaseMissing('circle_user', ['circle_id' => $this->circle->id]);
        $this->assertDatabaseMissing('circle_tag', ['circle_id' => $this->circle->id]);
        $this->assertDatabaseMissing('booths', ['circle_id' => $this->circle->id]);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function 権限がない場合は企画を削除できない()
    {
        $responce = $this->actingAs($this->staff)
            ->withSession(['staff_authorized' => true])
            ->delete(route('staff.circles.destroy', ['circle' => $this->circle]));

        $responce->assertForbidden();

        $this->assertDatabaseHas('answers', ['form_id' => $this->form->id, 'circle_id' => $this->circle->id]);
        $this->assertDatabaseHas('circle_user', ['circle_id' => $this->circle->id]);
        $this->assertDatabaseHas('circle_tag', ['circle_id' => $this->circle->id]);
        $this->assertDatabaseHas('booths', ['circle_id' => $this->circle->id]);
    }
}
