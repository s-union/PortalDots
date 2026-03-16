<?php

namespace App\Http\Controllers\Staff\Circles;

use App\Eloquents\Circle;
use App\Eloquents\ParticipationType;
use App\Eloquents\Place;
use App\Eloquents\Tag;
use App\Http\Controllers\Controller;

class EditAction extends Controller
{
    public function __invoke(Circle $circle)
    {
        if (! $circle->hasSubmitted()) {
            // 参加登録が未提出の企画の情報は閲覧・編集できない
            abort(404);
        }

        $circle->load('users');

        $member_ids = '';
        $members = $circle->users->filter(fn($user) => ! $user->pivot->is_leader);
        foreach ($members as $member) {
            $member_ids .= $member->student_id."\r\n";
        }

        return view('staff.circles.form')
            ->with('participation_types', ParticipationType::all('id', 'name'))
            ->with('circle', $circle)
            ->with('leader', $circle->users->filter(fn($user) => $user->pivot->is_leader)->first())
            ->with('members', $member_ids)
            ->with('default_places', $circle->places->map(fn($item) => ['text' => $item->name, 'value' => $item->id])->toJson())
            ->with('places_autocomplete_items', Place::get()->map(fn($item) => ['text' => $item->name, 'value' => $item->id])->toJson())
            ->with('default_tags', $circle->tags->pluck('name')->map(fn($item) => ['text' => $item])->toJson())
            ->with('tags_autocomplete_items', Tag::get()->pluck('name')->map(fn($item) => ['text' => $item])->toJson());
    }
}
