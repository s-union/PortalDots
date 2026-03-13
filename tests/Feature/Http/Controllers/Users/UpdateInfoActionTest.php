<?php

namespace Tests\Feature\Http\Controllers\Users;

use App\Eloquents\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class UpdateInfoActionTest extends TestCase
{
    use RefreshDatabase;

    /** @var User */
    private $user;

    public function setUp(): void
    {
        parent::setUp();

        Config::set('portal.univemail_local_part', 'student_id');
        Config::set('portal.univemail_domain_part', ['example.ac.jp']);
        Config::set('portal.student_id_name', 'student ID');
        Config::set('portal.univemail_name', 'univemail');

        $this->user = factory(User::class)->create([
            'student_id' => 'ABC00001',
            'univemail_local_part' => 'ABC00001',
            'univemail_domain_part' => 'example.ac.jp',
        ]);
    }

    /**
     * @test
     */
    public function 氏名を分割入力してユーザー情報を更新できる()
    {
        $response = $this->actingAs($this->user)
            ->from(route('user.edit'))
            ->patch(route('user.update'), [
                'student_id' => $this->user->student_id,
                'name_family' => '佐藤',
                'name_given' => '花子',
                'name_family_yomi' => 'さとう',
                'name_given_yomi' => 'はなこ',
                'email' => $this->user->email,
                'univemail_local_part' => $this->user->univemail_local_part,
                'univemail_domain_part' => $this->user->univemail_domain_part,
                'tel' => '09000000000',
                'password' => 'password',
            ]);

        $response->assertRedirect(route('user.edit'));
        $response->assertSessionHasNoErrors();

        $this->user->refresh();
        $this->assertSame('佐藤 花子', $this->user->name);
        $this->assertSame('さとう はなこ', $this->user->name_yomi);
        $this->assertSame('09000000000', $this->user->tel);
    }
}
