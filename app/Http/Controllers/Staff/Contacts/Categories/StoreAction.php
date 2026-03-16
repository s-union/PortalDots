<?php

namespace App\Http\Controllers\Staff\Contacts\Categories;

use App\Eloquents\ContactCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\Contacts\Categories\CategoryRequest;
use App\Services\Contacts\ContactCategoriesService;

class StoreAction extends Controller
{
    public function __construct(private readonly ContactCategoriesService $categoriesService)
    {
    }

    public function __invoke(CategoryRequest $request)
    {
        $category = ContactCategory::create([
            'name' => $request->name,
            'email' => $request->email,
        ]);

        $category->save();

        $this->categoriesService->send($category);

        return to_route('staff.contacts.categories.index')
            ->with('topAlert.title', 'メールアドレスを追加しました');
    }
}
