<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// トップページ
Route::get('/', \App\Http\Controllers\HomeAction::class)
    ->middleware(['circleSelected'])
    ->name('home');

// 推奨動作環境
Route::view('/support', 'support')->name('support');

// プライバシーポリシー
Route::view('/privacy_policy', 'privacy_policy')->name('privacy_policy');

// お知らせ
Route::prefix('/pages')
    ->name('pages.')
    ->middleware(['circleSelected'])
    ->group(function () {
        Route::get('/', \App\Http\Controllers\Pages\IndexAction::class)->name('index');
        Route::get('/{page}', \App\Http\Controllers\Pages\ShowAction::class)->name('show');
    });

// 配布資料
Route::prefix('/documents')
    ->name('documents.')
    ->middleware(['circleSelected'])
    ->group(function () {
        Route::get('/', \App\Http\Controllers\Documents\IndexAction::class)->name('index');
        Route::get('/{document}', \App\Http\Controllers\Documents\ShowAction::class)->name('show');
    });

// 外観設定
Route::get('/user/appearance', \App\Http\Controllers\Users\EditAppearanceAction::class)->name(
    'user.appearance'
);
Route::patch('/user/appearance', \App\Http\Controllers\Users\UpdateAppearanceAction::class);

// 認証系
Auth::routes([
    'register' => true,
    'reset' => false,
    'verify' => false,
]);

// メール認証系
Route::prefix('/email')
    ->name('verification.')
    ->group(function () {
        Route::get('/verify', \App\Http\Controllers\Auth\Email\VerifyNoticeAction::class)
            ->name('notice')
            ->middleware('auth');
        Route::get('/verify/{type}/{user}', \App\Http\Controllers\Auth\Email\VerifyAction::class)->name(
            'verify'
        );
        Route::post('/resend', \App\Http\Controllers\Auth\Email\ResendAction::class)
            ->name('resend')
            ->middleware('auth');
        Route::get('/verify/completed', \App\Http\Controllers\Auth\Email\CompletedAction::class)
            ->name('completed')
            ->middleware(['auth', 'verified']);
    });

// パスワードリセット系
Route::prefix('/password')
    ->name('password.')
    ->group(function () {
        Route::get('/reset', \App\Http\Controllers\Auth\Password\ResetStartAction::class)->name('request');
        Route::post('/reset', \App\Http\Controllers\Auth\Password\PostResetStartAction::class);

        Route::middleware('signed')->group(function () {
            Route::get(
                '/reset/{user}',
                \App\Http\Controllers\Auth\Password\ResetPasswordAction::class
            )->name('reset');
            Route::post(
                '/reset/{user}',
                \App\Http\Controllers\Auth\Password\PostResetPasswordAction::class
            );
        });
    });

// ログインさえされていればアクセスできるルート
Route::middleware(['auth'])->group(function () {
    Route::get('/logout', [\App\Http\Controllers\Auth\LoginController::class, 'showLogout']);
    Route::get('/user/edit', \App\Http\Controllers\Users\EditInfoAction::class)->name('user.edit');
    Route::patch('/user/update', \App\Http\Controllers\Users\UpdateInfoAction::class)->name('user.update');
    Route::get('/user/password', \App\Http\Controllers\Users\ChangePasswordAction::class)->name(
        'user.password'
    );
    Route::post('/user/password', \App\Http\Controllers\Users\PostChangePasswordAction::class);
    Route::get('/user/delete', \App\Http\Controllers\Users\DeleteAction::class)->name('user.delete');
    Route::delete('/user', \App\Http\Controllers\Users\DestroyAction::class)->name('user.destroy');
    // お問い合わせページ
    Route::middleware(['circleSelected'])->group(function () {
        Route::get('/contacts', \App\Http\Controllers\Contacts\CreateAction::class)->name('contacts');
        Route::post('/contacts', \App\Http\Controllers\Contacts\PostAction::class)->name('contacts.post');
    });

    // 企画セレクター (GETパラメーターの redirect に Route名 を入れる)
    Route::get('/selector', \App\Http\Controllers\Circles\Selector\ShowAction::class)->name(
        'circles.selector.show'
    );
    Route::get('/selector/set', \App\Http\Controllers\Circles\Selector\SetAction::class)->name(
        'circles.selector.set'
    );
});

// ログインされており、メールアドレス認証が済んでいる場合のみアクセス可能なルート
Route::middleware(['auth', 'verified'])->group(function () {
    // 企画参加登録
    Route::prefix('/circles')
        ->name('circles.')
        ->group(function () {
            Route::get('/create', \App\Http\Controllers\Circles\CreateAction::class)->name('create');
            Route::post('/', \App\Http\Controllers\Circles\StoreAction::class)->name('store');
            Route::get('/{circle}', \App\Http\Controllers\Circles\ShowAction::class)->name('show');
            Route::get('/{circle}/edit', \App\Http\Controllers\Circles\EditAction::class)->name('edit');
            Route::patch('/{circle}', \App\Http\Controllers\Circles\UpdateAction::class)->name('update');
            Route::get('/{circle}/auth', \App\Http\Controllers\Circles\Auth\ShowAction::class)->name(
                'auth'
            );
            Route::post('/{circle}/auth', \App\Http\Controllers\Circles\Auth\PostAction::class);
            Route::middleware(['can:circle.updateGroupName,circle'])->group(
                function () {
                    // 企画メンバー登録関連
                    Route::get(
                        '/{circle}/users',
                        \App\Http\Controllers\Circles\Users\IndexAction::class
                    )->name('users.index');
                    Route::get(
                        '/{circle}/users/invite/{token}',
                        \App\Http\Controllers\Circles\Users\InviteAction::class
                    )->name('users.invite');
                    Route::post(
                        '/{circle}/users',
                        \App\Http\Controllers\Circles\Users\StoreAction::class
                    )->name('users.store');
                    Route::delete(
                        '/{circle}/users/{user}',
                        \App\Http\Controllers\Circles\Users\DestroyAction::class
                    )->name('users.destroy');
                    Route::post(
                        '/{circle}/users/regenerate',
                        \App\Http\Controllers\Circles\Users\RegenerateTokenAction::class
                    )->name('users.regenerate');
                }
            );

            // 参加登録の提出
            Route::get('/{circle}/confirm', \App\Http\Controllers\Circles\ConfirmAction::class)->name(
                'confirm'
            );
            Route::post('/{circle}/submit', \App\Http\Controllers\Circles\SubmitAction::class)->name(
                'submit'
            );
            // 参加登録の提出完了
            Route::get('/{circle}/done', \App\Http\Controllers\Circles\DoneAction::class)->name('done');
            // 参加登録の削除
            Route::get('/{circle}/delete', \App\Http\Controllers\Circles\DeleteAction::class)->name(
                'delete'
            );
            Route::delete('/{circle}', \App\Http\Controllers\Circles\DestroyAction::class)->name(
                'destroy'
            );
        });

    // 申請
    Route::prefix('/forms')
        ->middleware(['circleSelected'])
        ->name('forms.')
        ->group(function () {
            Route::get('/', \App\Http\Controllers\Forms\IndexAction::class)->name('index');
            Route::get('/closed', \App\Http\Controllers\Forms\ClosedAction::class)->name('closed');
            Route::get('/all', \App\Http\Controllers\Forms\AllAction::class)->name('all');

            Route::prefix('/{form}/answers')
                ->name('answers.')
                ->group(function () {
                    Route::get(
                        '/{answer}/edit',
                        \App\Http\Controllers\Forms\Answers\EditAction::class
                    )->name('edit');
                    Route::patch(
                        '/{answer}',
                        \App\Http\Controllers\Forms\Answers\UpdateAction::class
                    )->name('update');
                    Route::get('/create', \App\Http\Controllers\Forms\Answers\CreateAction::class)->name(
                        'create'
                    );
                    Route::post('/', \App\Http\Controllers\Forms\Answers\StoreAction::class)->name(
                        'store'
                    );
                    Route::get(
                        '/{answer}/uploads/{question}',
                        \App\Http\Controllers\Forms\Answers\Uploads\ShowAction::class
                    )->name('uploads.show');
                });
        });
});
