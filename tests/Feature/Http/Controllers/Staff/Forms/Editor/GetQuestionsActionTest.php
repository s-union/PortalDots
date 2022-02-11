<?php

namespace Tests\Feature\Http\Controllers\Staff\Forms\Editor;

use App\Eloquents\CustomForm;
use App\Eloquents\Form;
use App\Eloquents\Permission;
use App\Eloquents\Question;
use App\Eloquents\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GetQuestionsActionTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function スタッフでなければアクセスできない()
    {
        /** @var Form $form */
        $form = factory(Form::class)->create();
        $user = factory(User::class)->create();
        $response = $this->actingAs($user)
            ->get('/staff/forms/' . $form->id . '/editor/api/get_questions');

        $response->assertForbidden();
    }

    /** @test */
    public function スタッフであっても権限がない場合はアクセスできない()
    {
        $form = factory(Form::class)->create();
        $user = factory(User::class)->create();
        $response = $this->actingAs($user)
            ->withSession(['staff_authorized' => true])
            ->get('/staff/forms/' . $form->id . '/editor/api/get_questions');

        $response->assertForbidden();
    }

    /**
     * 普通の申請で使用するフォームに関するテスト
     * @test
     */
    public function 固有の質問がないFormに対して正常にデータを取得できる()
    {
        $form = factory(Form::class)->create();
        $questions = factory(Question::class, 10)->make();
        $form->questions()->createMany(
            $questions->toArray()
        );

        $staff = factory(User::class)->state('staff')->create();
        Permission::create(['name' => 'staff.forms.edit']);
        $staff->syncPermissions(['staff.forms.edit']);

        $response = $this->actingAs($staff)
            ->withSession(['staff_authorized' => true])
            ->get('/staff/forms/' . $form->id . '/editor/api/get_questions');

        $response->assertOk();
        $response->assertJson(
            $questions->only([
                'id',
                'name',
                'description',
                'type',
                'is_required',
                'number_min',
                'number_max',
                'allowed_types',
                'options',
                'priority',
                'created_at',
                'updated_at'
            ])->toArray()
        );
    }

    /**
     * 参加登録申請で使用するフォームに関するテスト
     * @test
     */
    public function 固有の質問があるFormに対して正常にデータを取得できる()
    {
        $form = factory(Form::class)->create();
        $form->questions()->createMany(
            factory(Question::class, 10)->make()->toArray()
        );
        $custom_form = factory(CustomForm::class)->make();
        $form->customForm()->create($custom_form->toArray());

        $staff = factory(User::class)->state('staff')->create();
        Permission::create(['name' => 'staff.forms.edit']);
        $staff->syncPermissions(['staff.forms.edit']);

        $response = $this->actingAs($staff)
            ->withSession(['staff_authorized' => true])
            ->get('/staff/forms/' . $form->id . '/editor/api/get_questions');

        $response->assertOk();
        $response->assertJson(
            CustomForm::getPermanentQuestionsDict()[$custom_form->type]
        );
    }
}
