<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use Illuminate\Console\Scheduling\Schedule;
use Tests\TestCase;

final class KernelTest extends TestCase
{
    #[\PHPUnit\Framework\Attributes\Test]
    public function スケジュールがroutes_console_phpに適切に設定されていること()
    {
        $schedule = app()->make(Schedule::class);

        $events = $schedule->events();

        // 登録されているイベントが1つ以上あることを確認
        $this->assertGreaterThan(0, count($events));

        // cron('* * * * *') で設定された実行ジョブがあるか
        $found = false;
        foreach ($events as $event) {
            if ($event->expression === '* * * * *') {
                $found = true;
                break;
            }
        }
        $this->assertTrue($found, 'The job should be scheduled to run every minute (* * * * *).');
    }
}
