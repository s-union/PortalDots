<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Contacts;

use App\Eloquents\Circle;
use App\Eloquents\ContactCategory;
use App\Eloquents\User;
use App\Services\Contacts\ContactsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PostActionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var Circle
     */
    private $circle;

    /**
     * @var User
     */
    private $user;

    /**
     * @var ContactCategory
     */
    private $ContactCategory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->circle = Circle::factory()->create();
        $this->user = User::factory()->create();

        $this->circle->users()->attach($this->user->id, ['is_leader' => true]);

        $this->ContactCategory = ContactCategory::factory()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function contacts_serviceのcreateが呼び出される()
    {
        $this->mock(ContactsService::class, function ($mock) {
            $mock->shouldReceive('create')
                ->once()
                ->withArgs(function ($circle, $sender, $contactBody, $category, $ccSubleader) {
                    return $circle->id === $this->circle->id
                        && $sender->id === $this->user->id
                        && $contactBody === 'テストです！'
                        && $category->id === $this->ContactCategory->id
                        && $ccSubleader === true;
                });
        });

        $responce = $this
            ->actingAs($this->user)
            ->post(route('contacts.post'), [
                'circle_id' => $this->circle->id,
                'contact_body' => 'テストです！',
                'category' => $this->ContactCategory->id,
                'cc_subleader' => '1',
            ]);

        $responce->assertSessionHas('topAlert.title', 'お問い合わせを受け付けました。');
    }
}
