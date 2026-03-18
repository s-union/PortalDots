<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "staff" middleware group. Now create something great!
|
*/

// スタッフ認証
Route::middleware(['auth', 'verified', 'can:staff'])
    ->prefix('/staff/verify')
    ->name('staff.verify.')
    ->group(function () {
        Route::get('/', \App\Http\Controllers\Staff\Verify\IndexAction::class)->name('index');
        Route::post('/', \App\Http\Controllers\Staff\Verify\VerifyAction::class);
    });

// スタッフページ（多要素認証も済んでいる状態）
Route::middleware(['auth', 'verified', 'can:staff', 'staffAuthed'])
    ->prefix('/staff')
    ->name('staff.')
    ->group(function () {
        // トップページ
        Route::get('/', \App\Http\Controllers\Staff\HomeAction::class)->name('index');

        // リリース情報
        Route::get('/about', \App\Http\Controllers\Staff\AboutAction::class)->name('about');

        // Markdown ガイド
        //
        // 外部サイトにしてしまうとリンク切れが発生する恐れがあるため、
        // PortalDots 内部に Markdown ガイドを用意した
        //
        // このページのURLを変更する場合は
        // resources/js/v2/components/MarkdownEditor.vue
        // 内に含まれるこのページへのURLも修正すること
        Route::view('/markdown-guide', 'staff.markdown_guide')
            ->name('markdown-guide');

        // お知らせ
        Route::prefix('/pages')
            ->name('pages.')
            ->group(function () {
                Route::get('/', \App\Http\Controllers\Staff\Pages\IndexAction::class)->name('index')->middleware(['can:staff.pages.read']);
                Route::get('/api', \App\Http\Controllers\Staff\Pages\ApiAction::class)->name('api')->middleware(['can:staff.pages.read']);
                Route::get('/create', \App\Http\Controllers\Staff\Pages\CreateAction::class)->name('create')->middleware(['can:staff.pages.edit']);
                Route::post('/', \App\Http\Controllers\Staff\Pages\StoreAction::class)->name('store')->middleware(['can:staff.pages.edit']);
                Route::get('/{page}/edit', \App\Http\Controllers\Staff\Pages\EditAction::class)->name('edit')->middleware(['can:staff.pages.edit']);
                Route::patch('/{page}', \App\Http\Controllers\Staff\Pages\UpdateAction::class)->name('update')->middleware(['can:staff.pages.edit']);
                Route::delete('/{page}', \App\Http\Controllers\Staff\Pages\DestroyAction::class)->name('destroy')->middleware(['can:staff.pages.delete']);
                Route::patch('/{page}/pin', \App\Http\Controllers\Staff\Pages\PatchPinAction::class)->name('pin')->middleware(['can:staff.pages.edit']);
                Route::get('/export', \App\Http\Controllers\Staff\Pages\ExportAction::class)->name('export')->middleware(['can:staff.pages.export']);
            });

        // 申請
        Route::prefix('/forms')
            ->name('forms.')
            ->group(function () {
                Route::get('/', \App\Http\Controllers\Staff\Forms\IndexAction::class)->name('index')->middleware(['can:staff.forms.read']);
                Route::get('/api', \App\Http\Controllers\Staff\Forms\ApiAction::class)->name('api')->middleware(['can:staff.forms.read']);
                Route::get('/create', \App\Http\Controllers\Staff\Forms\CreateAction::class)->name('create')->middleware(['can:staff.forms.edit']);
                Route::post('/', \App\Http\Controllers\Staff\Forms\StoreAction::class)->name('store')->middleware(['can:staff.forms.edit']);
                Route::get('/{form}/edit', \App\Http\Controllers\Staff\Forms\EditAction::class)->name('edit')->middleware(['can:staff.forms.edit']);
                Route::patch('/{form}', \App\Http\Controllers\Staff\Forms\UpdateAction::class)->name('update')->middleware(['can:staff.forms.edit']);
                Route::delete('/{form}', \App\Http\Controllers\Staff\Forms\DestroyAction::class)->name('destroy')->middleware(['can:staff.forms.delete']);
                Route::get('/export', \App\Http\Controllers\Staff\Forms\ExportAction::class)->name('export')->middleware(['can:staff.forms.export']);
            });

        // 申請個別ページ
        Route::prefix('/forms/{form}')
            ->name('forms.')
            ->group(function () {
                // 回答確認
                Route::prefix('/answers')
                    ->name('answers.')
                    ->group(function () {
                        Route::get('/', \App\Http\Controllers\Staff\Forms\Answers\IndexAction::class)->name('index')->middleware(['can:staff.forms.answers.read']);
                        Route::get('/api', \App\Http\Controllers\Staff\Forms\Answers\ApiAction::class)->name('api')->middleware(['can:staff.forms.answers.read']);
                        Route::get('/{answer}/edit', \App\Http\Controllers\Staff\Forms\Answers\EditAction::class)->name('edit')->middleware(['can:staff.forms.answers.edit']);
                        Route::patch('/{answer}', \App\Http\Controllers\Staff\Forms\Answers\UpdateAction::class)->name('update')->middleware(['can:staff.forms.answers.edit']);
                        Route::get('/create', \App\Http\Controllers\Staff\Forms\Answers\CreateAction::class)->name('create')->middleware(['can:staff.forms.answers.edit']);
                        Route::post('/', \App\Http\Controllers\Staff\Forms\Answers\StoreAction::class)->name('store')->middleware(['can:staff.forms.answers.edit']);
                        Route::get('/{answer}/uploads/{question}', \App\Http\Controllers\Staff\Forms\Answers\Uploads\ShowAction::class)->name('uploads.show')->middleware(['can:staff.forms.answers.read']);
                        Route::delete('/{answer}', \App\Http\Controllers\Staff\Forms\Answers\DestroyAction::class)->name('destroy')->middleware(['can:staff.forms.answers.delete']);
                        Route::get('/uploads', \App\Http\Controllers\Staff\Forms\Answers\Uploads\IndexAction::class)->name('uploads.index')->middleware(['can:staff.forms.answers.export'])->middleware(['can:staff.forms.answers.export']);
                        Route::post('/uploads/download_zip', \App\Http\Controllers\Staff\Forms\Answers\Uploads\DownloadZipAction::class)->name('uploads.download_zip')->middleware(['can:staff.forms.answers.export']);
                        Route::get('/export', \App\Http\Controllers\Staff\Forms\Answers\ExportAction::class)->name('export')->middleware(['can:staff.forms.answers.export']);
                    });

                // 申請フォームエディタ
                Route::prefix('/editor')
                    ->middleware(['can:staff.forms.edit'])
                    ->group(function () {
                        Route::get('/', \App\Http\Controllers\Staff\Forms\Editor\IndexAction::class)->name('editor');
                        Route::get('/frame', \App\Http\Controllers\Staff\Forms\Editor\FrameAction::class)->name('editor.frame');
                        // ↓「editor.api」のroute定義は resources/views/staff/forms/editor.blade.php で利用しているので、消さないこと
                        Route::get('/api', \App\Http\Controllers\Staff\Forms\Editor\APIAction::class)->name('editor.api');
                        Route::get('/api/get_form', \App\Http\Controllers\Staff\Forms\Editor\GetFormAction::class);
                        Route::post('/api/update_form', \App\Http\Controllers\Staff\Forms\Editor\UpdateFormAction::class);
                        Route::get('/api/get_questions', \App\Http\Controllers\Staff\Forms\Editor\GetQuestionsAction::class);
                        Route::post('/api/add_question', \App\Http\Controllers\Staff\Forms\Editor\AddQuestionAction::class);
                        Route::post('/api/update_questions_order', \App\Http\Controllers\Staff\Forms\Editor\UpdateQuestionsOrderAction::class);
                        Route::post('/api/update_question', \App\Http\Controllers\Staff\Forms\Editor\UpdateQuestionAction::class);
                        Route::post('/api/delete_question', \App\Http\Controllers\Staff\Forms\Editor\DeleteQuestionAction::class);
                    });

                Route::get('/not_answered', \App\Http\Controllers\Staff\Forms\Answers\NotAnswered\ShowAction::class)->name('not_answered')->middleware(['can:staff.forms.answers.read']);

                Route::get('/preview', \App\Http\Controllers\Staff\Forms\PreviewAction::class)->name('preview')->middleware(['can:staff.forms.read']);

                // フォームの複製
                Route::post('/copy', \App\Http\Controllers\Staff\Forms\CopyAction::class)->name('copy')->middleware(['can:staff.forms.duplicate']);
            });

        Route::prefix('/users')
            ->name('users.')
            ->group(function () {
                Route::get('/', \App\Http\Controllers\Staff\Users\IndexAction::class)->name('index')->middleware(['can:staff.users.read']);
                Route::get('/api', \App\Http\Controllers\Staff\Users\ApiAction::class)->name('api')->middleware(['can:staff.users.read']);
                Route::get('/{user}/edit', \App\Http\Controllers\Staff\Users\EditAction::class)->name('edit')->middleware(['can:staff.users.edit']);
                Route::patch('/{user}', \App\Http\Controllers\Staff\Users\UpdateAction::class)->name('update')->middleware(['can:staff.users.edit']);
                Route::delete('/{user}', \App\Http\Controllers\Staff\Users\DestroyAction::class)->name('destroy')->middleware(['can:staff.users.edit']);
                Route::get('/export', \App\Http\Controllers\Staff\Users\ExportAction::class)->name('export')->middleware(['can:staff.users.export']);

                // 手動本人確認
                Route::patch('/{user}/verify', \App\Http\Controllers\Staff\Users\VerifiedAction::class)->name('verified')->middleware(['can:staff.users.edit']);
            });

        Route::prefix('/circles')
            ->name('circles.')
            ->group(function () {
                Route::get('/', \App\Http\Controllers\Staff\Circles\IndexAction::class)->name('index')->middleware(['can:staff.circles.read']);
                Route::get('/all', \App\Http\Controllers\Staff\Circles\AllAction::class)->name('all')->middleware(['can:staff.circles.read']);
                Route::get('/api', \App\Http\Controllers\Staff\Circles\ApiAction::class)->name('api')->middleware(['can:staff.circles.read']);
                Route::get('/export', \App\Http\Controllers\Staff\Circles\ExportAction::class)->name('export')->middleware(['can:staff.circles.export']);

                // 参加種別
                Route::prefix('/participation_types')
                    ->name('participation_types.')
                    ->group(function () {
                        // 参加種別の作成・編集
                        Route::get('/create', \App\Http\Controllers\Staff\Circles\ParticipationTypes\CreateAction::class)->name('create')->middleware(['can:staff.circles.participation_types']);
                        Route::post('/', \App\Http\Controllers\Staff\Circles\ParticipationTypes\StoreAction::class)->name('store')->middleware(['can:staff.circles.participation_types']);
                        Route::get('/{participation_type}/edit', \App\Http\Controllers\Staff\Circles\ParticipationTypes\EditAction::class)->name('edit')->middleware(['can:staff.circles.participation_types']);
                        Route::patch('/{participation_type}', \App\Http\Controllers\Staff\Circles\ParticipationTypes\UpdateAction::class)->name('update')->middleware(['can:staff.circles.participation_types']);
                        Route::delete('/{participation_type}', \App\Http\Controllers\Staff\Circles\ParticipationTypes\DestroyAction::class)->name('destroy')->middleware(['can:staff.circles.participation_types']);

                        // 参加登録フォームの設定
                        Route::get(
                            '/{participation_type}/form/edit',
                            \App\Http\Controllers\Staff\Circles\ParticipationTypes\Form\EditAction::class
                        )->name('form.edit')->middleware(['can:staff.circles.participation_types']);
                        Route::get(
                            '/{participation_type}/form/editor',
                            \App\Http\Controllers\Staff\Circles\ParticipationTypes\Form\EditorAction::class
                        )->name('form.editor')->middleware(['can:staff.circles.participation_types']);
                        Route::patch(
                            '/{participation_type}/form',
                            \App\Http\Controllers\Staff\Circles\ParticipationTypes\Form\UpdateAction::class
                        )->name('form.update')->middleware(['can:staff.circles.participation_types']);

                        // 参加種別ごとの企画一覧
                        Route::get('/{participation_type}', \App\Http\Controllers\Staff\Circles\ParticipationTypes\IndexAction::class)->name('index')->middleware(['can:staff.circles.read']);
                        Route::get('/{participation_type}/api', \App\Http\Controllers\Staff\Circles\ParticipationTypes\ApiAction::class)->name('api')->middleware(['can:staff.circles.read']);
                        Route::get('/{participation_type}/export', \App\Http\Controllers\Staff\Circles\ParticipationTypes\ExportAction::class)->name('export')->middleware(['can:staff.circles.read']);
                    });

                // 企画情報編集
                Route::get('/{circle}/edit', \App\Http\Controllers\Staff\Circles\EditAction::class)->name('edit')->middleware(['can:staff.circles.edit']);
                Route::patch('/{circle}', \App\Http\Controllers\Staff\Circles\UpdateAction::class)->name('update')->middleware(['can:staff.circles.edit']);
                Route::get('/create', \App\Http\Controllers\Staff\Circles\CreateAction::class)->name('create')->middleware(['can:staff.circles.edit']);
                Route::post('/', \App\Http\Controllers\Staff\Circles\StoreAction::class)->name('store')->middleware(['can:staff.circles.edit']);

                // 企画所属者宛のメール送信
                Route::get('/{circle}/email', \App\Http\Controllers\Staff\Circles\SendEmails\IndexAction::class)->name('email')->middleware(['can:staff.circles.send_email']);
                Route::post('/{circle}/email', \App\Http\Controllers\Staff\Circles\SendEmails\SendAction::class)->middleware(['can:staff.circles.send_email']);

                Route::delete('/{circle}', \App\Http\Controllers\Staff\Circles\DestroyAction::class)->name('destroy')->middleware(['can:staff.circles.delete']);
            });

        Route::prefix('/tags')
            ->name('tags.')
            ->group(function () {
                Route::get('/', \App\Http\Controllers\Staff\Tags\IndexAction::class)->name('index')->middleware(['can:staff.tags.read']);
                Route::get('/api', \App\Http\Controllers\Staff\Tags\ApiAction::class)->name('api')->middleware(['can:staff.tags.read']);
                Route::get('/create', \App\Http\Controllers\Staff\Tags\CreateAction::class)->name('create')->middleware(['can:staff.tags.edit']);
                Route::post('/', \App\Http\Controllers\Staff\Tags\StoreAction::class)->name('store')->middleware(['can:staff.tags.edit']);
                Route::get('/{tag}/edit', \App\Http\Controllers\Staff\Tags\EditAction::class)->name('edit')->middleware(['can:staff.tags.edit']);
                Route::patch('/{tag}', \App\Http\Controllers\Staff\Tags\UpdateAction::class)->name('update')->middleware(['can:staff.tags.edit']);
                Route::get('/{tag}/delete', \App\Http\Controllers\Staff\Tags\DeleteAction::class)->name('delete')->middleware(['can:staff.tags.delete']);
                Route::delete('/{tag}', \App\Http\Controllers\Staff\Tags\DestroyAction::class)->name('destroy')->middleware(['can:staff.tags.delete']);
                Route::get('/export', \App\Http\Controllers\Staff\Tags\ExportAction::class)->name('export')->middleware(['can:staff.tags.export']);
            });

        Route::prefix('/places')
            ->name('places.')
            ->group(function () {
                Route::get('/', \App\Http\Controllers\Staff\Places\IndexAction::class)->name('index')->middleware(['can:staff.places.read']);
                Route::get('/api', \App\Http\Controllers\Staff\Places\ApiAction::class)->name('api')->middleware(['can:staff.places.read']);
                Route::get('/create', \App\Http\Controllers\Staff\Places\CreateAction::class)->name('create')->middleware(['can:staff.places.edit']);
                Route::post('/', \App\Http\Controllers\Staff\Places\StoreAction::class)->name('store')->middleware(['can:staff.places.edit']);
                Route::get('/{place}/edit', \App\Http\Controllers\Staff\Places\EditAction::class)->name('edit')->middleware(['can:staff.places.edit']);
                Route::patch('/{place}', \App\Http\Controllers\Staff\Places\UpdateAction::class)->name('update')->middleware(['can:staff.places.edit']);
                Route::delete('/{place}', \App\Http\Controllers\Staff\Places\DestroyAction::class)->name('destroy')->middleware(['can:staff.places.delete']);
                Route::get('/export', \App\Http\Controllers\Staff\Places\ExportAction::class)->name('export')->middleware(['can:staff.places.export']);
            });

        // メール一斉送信
        Route::get('/send_emails', \App\Http\Controllers\Staff\SendEmails\IndexAction::class)->name('send_emails')->middleware(['can:staff.pages.send_emails']);
        Route::delete('/send_emails', \App\Http\Controllers\Staff\SendEmails\DestroyAction::class)->middleware(['can:staff.pages.send_emails']);

        Route::prefix('/contacts')
            ->name('contacts.')
            ->group(function () {
                // お問い合わせのメールリスト
                Route::get('/categories', \App\Http\Controllers\Staff\Contacts\Categories\IndexAction::class)->name('categories.index')->middleware(['can:staff.contacts.categories.read']);
                Route::get('/categories/create', \App\Http\Controllers\Staff\Contacts\Categories\CreateAction::class)->name('categories.create')->middleware(['can:staff.contacts.categories.edit']);
                Route::post('/categories/create', \App\Http\Controllers\Staff\Contacts\Categories\StoreAction::class)->middleware(['can:staff.contacts.categories.edit']);
                Route::get('/categories/{category}/edit', \App\Http\Controllers\Staff\Contacts\Categories\EditAction::class)->name('categories.edit')->middleware(['can:staff.contacts.categories.edit']);
                Route::patch('/categories/{category}', \App\Http\Controllers\Staff\Contacts\Categories\UpdateAction::class)->name('categories.update')->middleware(['can:staff.contacts.categories.edit']);
                Route::get('/categories/{category}/delete', \App\Http\Controllers\Staff\Contacts\Categories\DeleteAction::class)->name('categories.delete')->middleware(['can:staff.contacts.categories.delete']);
                Route::delete('/categories/{category}', \App\Http\Controllers\Staff\Contacts\Categories\DestroyAction::class)->name('categories.destroy')->middleware(['can:staff.contacts.categories.delete']);
            });

        // 配布資料
        Route::prefix('/documents')
            ->name('documents.')
            ->group(function () {
                Route::get('/', \App\Http\Controllers\Staff\Documents\IndexAction::class)->name('index')->middleware(['can:staff.documents.read']);
                Route::get('/api', \App\Http\Controllers\Staff\Documents\ApiAction::class)->name('api')->middleware(['can:staff.documents.read']);
                Route::get('/create', \App\Http\Controllers\Staff\Documents\CreateAction::class)->name('create')->middleware(['can:staff.documents.edit']);
                Route::post('/', \App\Http\Controllers\Staff\Documents\StoreAction::class)->name('store')->middleware(['can:staff.documents.edit']);
                Route::get('/export', \App\Http\Controllers\Staff\Documents\ExportAction::class)->name('export')->middleware(['can:staff.documents.export']);
                Route::get('/{document}/edit', \App\Http\Controllers\Staff\Documents\EditAction::class)->name('edit')->middleware(['can:staff.documents.edit']);
                Route::patch('/{document}', \App\Http\Controllers\Staff\Documents\UpdateAction::class)->name('update')->middleware(['can:staff.documents.edit']);
                Route::get('/{document}', \App\Http\Controllers\Staff\Documents\ShowAction::class)->name('show')->middleware(['can:staff.documents.read']);
                Route::delete('/{document}', \App\Http\Controllers\Staff\Documents\DestroyAction::class)->name('destroy')->middleware(['can:staff.documents.delete']);
            });

        // スタッフの権限設定
        Route::prefix('/permissions')
            ->name('permissions.')
            ->group(function () {
                Route::get('/', \App\Http\Controllers\Staff\Permissions\IndexAction::class)->name('index')->middleware(['can:staff.permissions.read']);
                Route::get('/api', \App\Http\Controllers\Staff\Permissions\ApiAction::class)->name('api')->middleware(['can:staff.permissions.read']);
                Route::get('/{user}/edit', \App\Http\Controllers\Staff\Permissions\EditAction::class)->name('edit')->middleware(['can:staff.permissions.edit']);
                Route::patch('/{user}', \App\Http\Controllers\Staff\Permissions\UpdateAction::class)->name('update')->middleware(['can:staff.permissions.edit']);
            });
    });

// 管理者ページ（多要素認証も済んでいる状態）
Route::middleware(['auth', 'verified', 'can:admin', 'staffAuthed'])
    ->prefix('/admin')
    ->name('admin.')
    ->group(function () {
        // アクティビティログ
        Route::get('/activity_log', \App\Http\Controllers\Admin\ActivityLog\IndexAction::class)->name('activity_log.index');
        Route::get('/activity_log/api', \App\Http\Controllers\Admin\ActivityLog\ApiAction::class)->name('activity_log.api');

        // ポータル情報編集
        Route::get('/portal', \App\Http\Controllers\Admin\Portal\EditAction::class)->name('portal.edit');
        Route::patch('/portal', \App\Http\Controllers\Admin\Portal\UpdateAction::class)->name('portal.update');
    });
