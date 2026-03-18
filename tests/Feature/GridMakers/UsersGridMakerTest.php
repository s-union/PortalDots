<?php

declare(strict_types=1);

namespace Tests\Feature\GridMakers;

use App\Eloquents\User;
use App\GridMakers\UsersGridMaker;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

final class UsersGridMakerTest extends TestCase
{
    /**
     * @var UsersGridMaker
     */
    private $usersGridMaker;

    protected function setUp(): void
    {
        parent::setUp();

        $this->usersGridMaker = App::make(UsersGridMaker::class);
        \Illuminate\Support\Facades\Date::setTestNowAndTimezone(new CarbonImmutable('2020-02-08 00:00:00'));
        CarbonImmutable::setTestNowAndTimezone(new CarbonImmutable('2020-02-08 00:00:00'));
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function map()
    {
        $user = User::factory()->make([
            'last_accessed_at' => '2020-02-02 02:02:02',
            'created_at' => '2020-02-02 02:02:02',
            'updated_at' => '2020-02-02 02:02:02',
        ]);

        $result = $this->usersGridMaker->map($user);

        $this->assertSame('5日前', $result['last_accessed_at']); // 02:02:02 を迎えていないので 5日前 と返ってくる
        $this->assertSame('2020/02/02 02:02:02', $result['created_at']);
        $this->assertSame('2020/02/02 02:02:02', $result['updated_at']);
    }

    public static function formatLastAccessedAt_provider(): \Iterator
    {
        yield [new CarbonImmutable('2020-02-07 23:23:23'), '1時間以内'];
        yield [new CarbonImmutable('2020-02-01 01:23:45'), '6日前'];
        yield [new CarbonImmutable('2019-10-31 19:10:31'), '3ヶ月前'];
        yield [new CarbonImmutable('2012-05-22 09:30:00'), '1年以上前'];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('formatLastAccessedAt_provider')]
    #[\PHPUnit\Framework\Attributes\Test]
    public function format_last_accessed_at(CarbonImmutable $last_accessed_at, string $expected)
    {
        $user = User::factory()->make([
            'last_accessed_at' => $last_accessed_at,
        ]);
        $this->assertSame($expected, $user->formatLastAccessedAt());
    }
}
