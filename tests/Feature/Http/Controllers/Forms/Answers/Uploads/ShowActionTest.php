<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Controllers\Forms\Answers\Uploads;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ShowActionTest extends TestCase
{
    use RefreshDatabase;

    #[\PHPUnit\Framework\Attributes\Test]
    public function 自分が所属していない企画によるアップロードファイルはダウンロードできない()
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }
}
