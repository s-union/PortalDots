<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Console\Kernel;
use Illuminate\Console\Scheduling\Schedule;
use Tests\TestCase;

final class KernelTest extends TestCase
{
    #[\PHPUnit\Framework\Attributes\Test]
    public function スケジュールが適切に設定されていること()
    {
        $kernel = app()->make(Kernel::class);
        $schedule = app()->make(Schedule::class);

        // Kernelのschedule()を呼び出すためにリフレクションを使用
        $method = new \ReflectionMethod(Kernel::class, 'schedule');
        $method->invoke($kernel, $schedule);

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
