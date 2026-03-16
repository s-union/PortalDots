<?php

namespace App\Providers;

use App\Services\Circles\SelectorService;
use App\Services\Pages\ReadsService;
use Illuminate\Database\Eloquent\Factories\Factory;
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

        // モデルクラス名から、対応するファクトリクラス名を推測するロジックをカスタマイズ
        Factory::guessFactoryNamesUsing(function (string $modelName) {
            // ファクトリが配置されている共通のネームスペースを指定
            $namespace = 'Database\\Factories\\';

            // モデルのフルネーム（App\Eloquents\User など）からクラス名部分（User）だけを取り出し、末尾に "Factory" を付与して結合
            return $namespace.class_basename($modelName).'Factory';
        });
    }
}
