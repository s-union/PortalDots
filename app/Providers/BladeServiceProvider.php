<?php

namespace App\Providers;

use App\Services\Circles\SelectorService;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;
use Request;

class BladeServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot(SelectorService $selectorService)
    {
        // スタッフページかどうかを Blade 上で判断できるようにする
        // @staffpage 〜 @endstaffpage
        // の中は、スタッフページの場合のみ表示される
        Blade::if('staffpage', fn() => Request::is('staff*') || Request::is('admin*'));

        // 渡された引数の文字列をMarkdownとして解釈し、
        // HTMLに変換した文字列を表示する
        Blade::directive('markdown', fn($expression) => "<?php echo App\Services\Utils\ParseMarkdownService::render($expression); ?>");

        // 渡された引数の文字列を先頭100文字のみのこし、
        // 残りを「...」で省略する
        Blade::directive('summary', fn($expression) => "<?php echo e(App\Services\Utils\FormatTextService::summary($expression)); ?>");

        // 渡された引数の日付文字列をY年n月d日(曜日) H:i 形式の日付文字列にする
        Blade::directive('datetime', fn($expression) => "<?php echo e(App\Services\Utils\FormatTextService::datetime($expression)); ?>");

        // 渡された引数の曜日番号を曜日文字列にする
        Blade::directive('dayByDayId', fn($expression) => "<?php echo e(App\Services\Utils\FormatTextService::getDayByDayId((int)($expression), true)); ?>");

        // 渡された引数のバイト数値からユーザーフレンドリーなファイルサイズ文字列にする
        Blade::directive('filesize', fn($expression) => "<?php echo e(App\Services\Utils\FormatTextService::filesize((int)($expression))); ?>");
    }
}
