<?php

namespace Tests\Feature\Services\Contacts;

use App\Mail\Contacts\ContactMailable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use App\Services\Contacts\ContactsService;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;
use App;
use App\Eloquents\Circle;
use App\Eloquents\ContactCategory;
use App\Eloquents\User;

class ContactsServeceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var ContactsService
     */
    private $contactsService;

        /**
     * @var Circle
     */
    private $circle;

    /**
     * @var User
     */
    private $leader;

    /**
     * @var User
     */
    private $member;

    /**
     * @var ContactCategory
     */
    private $contactCategory;

    public function setUp(): void
    {
        parent::setUp();
        $this->contactsService = App::make(ContactsService::class);
        $this->circle = Circle::factory()->create();
        $this->leader = User::factory()->create();
        $this->member = User::factory()->create();

        $this->circle->users()->attach([
            $this->leader->id => ['is_leader' => true],
            $this->member->id,
        ]);

        $this->contactCategory = ContactCategory::factory()->create();
    }

    private function create()
    {
        Mail::fake();

        $this->contactsService->create($this->circle, $this->leader, "こんにちは。\nこれはてすとです。", $this->contactCategory);
    }

    /**
     * @test
     */
    public function send_お問い合わせが企画のメンバーに送信できる()
    {
        $this->create();

        Mail::assertSent(ContactMailable::class, function ($mail) {
            return $mail->hasTo($this->leader->email);
        });

        Mail::assertSent(ContactMailable::class, function ($mail) {
            return $mail->hasTo($this->member->email);
        });
    }

    /**
     * @test
     */
    public function sendToStaff_スタッフ用控えが送信できる()
    {
        $this->create();

        Mail::assertSent(ContactMailable::class, function ($mail) {
            return $mail->hasTo($this->contactCategory->email);
        });
    }
}
