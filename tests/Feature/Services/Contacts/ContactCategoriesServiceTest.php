<?php

declare(strict_types=1);

namespace Tests\Feature\Services\Contacts;

use App\Eloquents\ContactCategory;
use App\Mail\Contacts\EmailCategoryMailable;
use App\Services\Contacts\ContactCategoriesService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class ContactCategoriesServiceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @var ContactCategoriesService
     */
    private $categoriesService;

    /**
     * @var ContactCategory
     */
    private $contactCategory;

    protected function setUp(): void
    {
        parent::setUp();
        $this->categoriesService = App::make(ContactCategoriesService::class);

        $this->contactCategory = ContactCategory::factory()->create();
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function send_contact_categoryへメール送信ができる()
    {
        Mail::fake();

        $this->categoriesService->send($this->contactCategory);

        Mail::assertSent(EmailCategoryMailable::class, fn($mail) => $mail->hasTo($this->contactCategory->email));
    }
}
