<?php

namespace App\Http\Controllers\Install\Database;

use App\Http\Controllers\Controller;
use App\Http\Requests\Install\DatabaseRequest;
use App\Services\Install\DatabaseService;

class UpdateAction extends Controller
{
    public function __construct(private readonly DatabaseService $databaseService)
    {
    }

    public function __invoke(DatabaseRequest $request)
    {
        if (! $this->databaseService->canConnectDatabase(
            $request->DB_HOST,
            (int) $request->DB_PORT,
            $request->DB_DATABASE,
            $request->DB_USERNAME,
            $request->DB_PASSWORD
        )) {
            return back()
                ->withInput()
                ->with('topAlert.type', 'danger')
                ->with('topAlert.keepVisible', true)
                ->with('topAlert.title', '設定をご確認ください')
                ->with('topAlert.body', '入力された情報でデータベースに接続できませんでした。入力内容が正しいかご確認ください');
        }

        $this->databaseService->updateInfo($request->all());

        return to_route('install.mail.edit');
    }
}
