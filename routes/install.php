<?php

use Illuminate\Support\Facades\Route;

Route::prefix('/install')
    ->name('install.')
    ->group(function () {
        Route::get('/', \App\Http\Controllers\Install\HomeAction::class)->name('index');
        Route::get('/portal', \App\Http\Controllers\Install\Portal\EditAction::class)->name('portal.edit');
        Route::patch('/portal', \App\Http\Controllers\Install\Portal\UpdateAction::class)->name('portal.update');
        Route::get('/database', \App\Http\Controllers\Install\Database\EditAction::class)->name('database.edit');
        Route::patch('/database', \App\Http\Controllers\Install\Database\UpdateAction::class)->name('database.update');
        Route::get('/mail', \App\Http\Controllers\Install\Mail\EditAction::class)->name('mail.edit');
        Route::patch('/mail', \App\Http\Controllers\Install\Mail\UpdateAction::class)->name('mail.update');
        Route::post('/mail/send_test', \App\Http\Controllers\Install\Mail\SendTestAction::class)->name('mail.send_test');
        Route::get('/admin', \App\Http\Controllers\Install\Admin\CreateAction::class)->name('admin.create');
        Route::post('/admin', \App\Http\Controllers\Install\Admin\StoreAction::class)->name('admin.store');
    });
