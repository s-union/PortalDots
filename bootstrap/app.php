<?php

use App\Http\Middleware\Authenticate;
use App\Http\Middleware\CheckEnv;
use App\Http\Middleware\CheckSelectedCircle;
use App\Http\Middleware\DemoMode;
use App\Http\Middleware\DenyIfInstalled;
use App\Http\Middleware\EncryptCookies;
use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\ForceHttps;
use App\Http\Middleware\PreventRequestsDuringMaintenance;
use App\Http\Middleware\RedirectIfAuthenticated;
use App\Http\Middleware\RedirectIfStaffNotAuthenticated;
use App\Http\Middleware\TrimStrings;
use App\Http\Middleware\TrustProxies;
use App\Http\Middleware\Turbolinks;
use App\Http\Middleware\UpdateLastAccessedAt;
use App\Http\Middleware\ValidateSignature;
use App\Http\Middleware\VerifyCsrfToken;
use Illuminate\Auth\Middleware\AuthenticateWithBasicAuth;
use Illuminate\Auth\Middleware\Authorize;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull;
use Illuminate\Foundation\Http\Middleware\InvokeDeferredCallbacks;
use Illuminate\Foundation\Http\Middleware\ValidatePostSize;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Middleware\SetCacheHeaders;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Session\Middleware\AuthenticateSession;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        then: function (): void {
            // 一般画面用ルート（ログイン前後で共通利用）
            \Illuminate\Support\Facades\Route::middleware(['web', 'checkEnv'])
                ->namespace('App\\Http\\Controllers')
                ->group(base_path('routes/web.php'));

            // スタッフ画面用ルート
            \Illuminate\Support\Facades\Route::middleware(['web', 'checkEnv'])
                ->namespace('App\\Http\\Controllers')
                ->group(base_path('routes/staff.php'));

            // 初期セットアップ画面用ルート（未インストール時のみ）
            \Illuminate\Support\Facades\Route::middleware(['web', 'install'])
                ->namespace('App\\Http\\Controllers')
                ->group(base_path('routes/install.php'));

            // API ルート（/api プレフィックス + api ミドルウェア）
            \Illuminate\Support\Facades\Route::prefix('api')
                ->middleware('api')
                ->namespace('App\\Http\\Controllers')
                ->group(base_path('routes/api.php'));
        }
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // 全リクエストに適用するグローバルミドルウェア
        $middleware->use([
            InvokeDeferredCallbacks::class,
            ForceHttps::class,
            PreventRequestsDuringMaintenance::class,
            ValidatePostSize::class,
            TrimStrings::class,
            ConvertEmptyStringsToNull::class,
            TrustProxies::class,
            HandleCors::class,
        ]);

        // ブラウザ画面向けミドルウェア（セッション・CSRF あり）
        $middleware->group('web', [
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
            DemoMode::class,
            ShareErrorsFromSession::class,
            VerifyCsrfToken::class,
            SubstituteBindings::class,
            Turbolinks::class,
            UpdateLastAccessedAt::class,
        ]);

        // API 向けミドルウェア（ステートレス運用を想定）
        $middleware->group('api', [
            'throttle:60,1',
            SubstituteBindings::class,
        ]);

        // ルート定義で使うエイリアス（可読性向上のため短縮名を付与）
        $middleware->alias([
            'auth' => Authenticate::class,
            'auth.basic' => AuthenticateWithBasicAuth::class,
            'cache.headers' => SetCacheHeaders::class,
            'can' => Authorize::class,
            'guest' => RedirectIfAuthenticated::class,
            'signed' => ValidateSignature::class,
            'throttle' => ThrottleRequests::class,
            'verified' => EnsureEmailIsVerified::class,
            'staffAuthed' => RedirectIfStaffNotAuthenticated::class,
            'checkEnv' => CheckEnv::class,
            'install' => DenyIfInstalled::class,
            'circleSelected' => CheckSelectedCircle::class,
        ]);

        // ミドルウェア実行順序（依存関係のあるものは順番を固定）
        $middleware->priority([
            CheckEnv::class,
            DenyIfInstalled::class,
            StartSession::class,
            DemoMode::class,
            ShareErrorsFromSession::class,
            Turbolinks::class,
            Authenticate::class,
            ThrottleRequests::class,
            AuthenticateSession::class,
            SubstituteBindings::class,
            Authorize::class,
            CheckSelectedCircle::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontFlash([
            'current_password',
            'password',
            'password_confirmation',
        ]);

        $exceptions->render(function (\PDOException $exception, Request $request) {
            if (! config('app.debug')) {
                // データベース接続エラー
                //
                // そのまま Blade ファイルによるエラーページを表示してしまうと、
                // Blade ファイル内からデータベース接続が行われ、エラーページを
                // 正常に表示することができない。そのため、Blade ファイルを使わず
                // にエラーを表示する。
                //
                // このエラーが表示される状況の例は以下の通り。
                //  1. データベース設定が間違っている
                //  2. 接続先のデータベースにPortalDotsで利用するテーブルがない
                //     →データベース内のデータを全削除した上でテーブルを作り直す
                //       コマンド : php artisan migrate:refresh
                $appName = config('app.name');

                return response("
                <!doctype html>
                <meta charset=\"utf-8\">
                <title>データベース接続エラー</title>
                <div style=\"text-align: center\">
                    <h1>データベースと接続できません</h1>
                    <hr>
                    <p>設定ファイル(.env)内のデータベース設定が正しいかご確認ください。</p>
                    <hr>
                    <p>{$appName} • Powered by PortalDots</p>
                </div>");
            }
        });

        $exceptions->respond(function (Response $response, \Throwable $exception, Request $request): Response {
            // ステータスコードがエラーとなるページへのアクセスは Turbolinks に
            // 対応していないので、200 を返す
            if (
                ! empty($request->headers->get('Turbolinks-Referrer'))
                && in_array($response->getStatusCode(), [403, 404, 500, 503], true)
            ) {
                $response->setStatusCode(200);
            }

            return $response;
        });
    })
    ->create();
