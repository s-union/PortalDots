<?php

declare(strict_types=1);

namespace App\Providers;

use App\Auth\AppUserProvider;
use App\Eloquents\Page;
use App\Eloquents\User;
use App\Policies\PagePolicy;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Page::class => PagePolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
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

        Gate::guessPolicyNamesUsing(fn($modelClass) => 'App\\Policies\\'.class_basename($modelClass).'Policy');

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
    }
}
