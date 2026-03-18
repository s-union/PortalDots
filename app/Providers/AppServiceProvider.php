<?php

namespace App\Providers;

use App\Auth\AppUserProvider;
use App\Eloquents\Page;
use App\Eloquents\User;
use App\Policies\PagePolicy;
use App\Services\Circles\SelectorService;
use App\Services\Pages\ReadsService;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public $singletons = [
        SelectorService::class => SelectorService::class,
        ReadsService::class => ReadsService::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // MySQL5.7.7未満のときに 1071 Specified key was too long
        // エラーが発生しないようにする
        Schema::defaultStringLength(191);

        // 旧AuthServiceProvider.php部分
        // ユーザーモデルとポリシーの対応を定義
        Gate::policy(Page::class, PagePolicy::class);

        // 管理者で、メール認証やスタッフ認証が済んでいる場合、
        // auth()->user->can() や @can() などで true を返すようにする
        Gate::after(function (User $user) {
            if (config('portal.enable_demo_mode')) {
                // デモモードの場合は許可
                return true;
            }

            return $user->is_admin && $user->areBothEmailsVerified() &&
                session()->get('staff_authorized') ? true : null;
        });

        Gate::guessPolicyNamesUsing(fn($modelClass) => 'App\\Policies\\' . class_basename($modelClass) . 'Policy');

        Auth::provider('app', fn(Application $app, array $config) => new AppUserProvider($app['hash'], $config['model']));

        // メール認証が完了している場合のみ使える機能
        Gate::define('use-all-features', fn(User $user) => $user->areBothEmailsVerified());

        // スタッフ
        Gate::define('staff', fn(User $user) => $user->is_staff === true);

        // 管理者
        Gate::define('admin', fn(User $user) => $user->is_admin === true);

        Gate::define('circle.belongsTo', \App\Policies\Circle\BelongsPolicy::class);
        Gate::define('circle.update', \App\Policies\Circle\UpdatePolicy::class);
        Gate::define('circle.create', \App\Policies\Circle\CreatePolicy::class);
        Gate::define('circle.updateGroupName', \App\Policies\Circle\UpdateGroupNamePolicy::class);
        // ここまで旧AuthServiceProvider.php部分

        // 旧BladeServiceProvider.php部分
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
        // ここまで旧BladeServiceProvider.php部分

        // モデルクラス名から、対応するファクトリクラス名を推測するロジックをカスタマイズ
        Factory::guessFactoryNamesUsing(function (string $modelName) {
            // ファクトリが配置されている共通のネームスペースを指定
            $namespace = 'Database\\Factories\\';

            // モデルのフルネーム（App\Eloquents\User など）からクラス名部分（User）だけを取り出し、末尾に "Factory" を付与して結合
            return $namespace . class_basename($modelName) . 'Factory';
        });
    }
}
