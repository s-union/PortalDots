<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Contacts;

use App\Eloquents\Circle;
use App\Eloquents\ContactCategory;
use App\Eloquents\User;
use App\Mail\Contacts\ContactMailable;
use App\Services\Contacts\ContactsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class ContactsServeceTest extends TestCase
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

    protected function setUp(): void
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

    private function create(bool $ccSubleader = true)
    {
        Mail::fake();

        $this->contactsService->create(
            $this->circle,
            $this->leader,
            "こんにちは。\nこれはてすとです。",
            $this->contactCategory,
            $ccSubleader
        );
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function send_お問い合わせが企画のメンバーに送信できる()
    {
        $this->create(true);

        Mail::assertSent(ContactMailable::class, fn($mail) => $mail->hasTo($this->leader->email));

        Mail::assertSent(ContactMailable::class, fn($mail) => $mail->hasTo($this->member->email));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function send_副責任者へのccを無効にした場合は企画責任者のみに送信される()
    {
        $this->create(false);

        Mail::assertSent(ContactMailable::class, fn($mail) => $mail->hasTo($this->leader->email));
        Mail::assertNotSent(ContactMailable::class, fn($mail) => $mail->hasTo($this->member->email));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function send_to_staff_スタッフ用控えが送信できる()
    {
        $this->create();

        Mail::assertSent(ContactMailable::class, fn($mail) => $mail->hasTo($this->contactCategory->email));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function send_to_staff_副責任者ccが有効ならreply_toに送信者と副責任者が含まれる()
    {
        $this->create(true);

        Mail::assertSent(ContactMailable::class, fn($mail) => $mail->hasTo($this->contactCategory->email)
            && $mail->hasReplyTo($this->leader->email, $this->leader->name)
            && $mail->hasReplyTo($this->member->email, $this->member->name));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function send_to_staff_副責任者ccが無効ならreply_toは送信者のみになる()
    {
        $this->create(false);

        Mail::assertSent(ContactMailable::class, fn($mail) => $mail->hasTo($this->contactCategory->email)
            && $mail->hasReplyTo($this->leader->email, $this->leader->name)
            && ! $mail->hasReplyTo($this->member->email, $this->member->name));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function send_副責任者がcc無効で送信した場合は責任者へ送信されない()
    {
        Mail::fake();

        $this->contactsService->create(
            $this->circle,
            $this->member,
            "こんにちは。\nこれはてすとです。",
            $this->contactCategory,
            false
        );

        Mail::assertSent(ContactMailable::class, fn($mail) => $mail->hasTo($this->member->email));
        Mail::assertNotSent(ContactMailable::class, fn($mail) => $mail->hasTo($this->leader->email));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function send_to_staff_送信者が副責任者でもreply_toに重複がない()
    {
        Mail::fake();

        $this->contactsService->create(
            $this->circle,
            $this->member,
            "こんにちは。\nこれはてすとです。",
            $this->contactCategory,
            true
        );

        Mail::assertSent(ContactMailable::class, function ($mail) {
            if (! $mail->hasTo($this->contactCategory->email)) {
                return false;
            }

            $replyToAddresses = collect($mail->replyTo)->pluck('address');

            return $mail->hasReplyTo($this->leader->email, $this->leader->name)
                && $mail->hasReplyTo($this->member->email, $this->member->name)
                && $replyToAddresses->count() === $replyToAddresses->unique()->count();
        });
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function send_企画未選択の場合は送信者本人に送信される()
    {
        Mail::fake();

        $this->contactsService->create(
            null,
            $this->leader,
            "こんにちは。\nこれはてすとです。",
            $this->contactCategory,
            true
        );

        Mail::assertSent(ContactMailable::class, fn($mail) => $mail->hasTo($this->leader->email));
    }
}
