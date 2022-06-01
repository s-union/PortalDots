@extends('layouts.no_drawer')

@section('no_circle_selector', true)

@section('title', $group->hasSubmitted() ? '団体情報詳細' : '団体参加登録')

@section('content')
    <app-header container-medium>
        <template v-slot:title>
            {{ $group->hasSubmitted() ? '団体情報詳細' : '理大祭参加登録' }}
        </template>
        <span class="text-muted">
            {{ $group->group_name }}
            @if(!$group->hasSubmitted())
                <app-badge muted outline>未提出</app-badge>
            @else
                <app-badge success outline>提出済</app-badge>
            @endif
        </span>
        @if ($group->circle())
            @if ($group->circle()->isPending())
                <app-badge danger outline>企画参加登録費支払い待ち</app-badge>
            @elseif ($group->circle()->hasApproved())
                <app-badge success>企画参加登録受理</app-badge>
            @endif
        @endif
        @if(!Auth::user()->isLeaderInGroup($group) && Gate::allows('group.update', $group))
            <form-with-confirm
                action="{{ route('groups.users.destroy', ['group' => $group, 'user' => Auth::user()]) }}"
                method="post"
                confirm-message="本当にこの団体から抜けますか？">
                @method('delete')
                @csrf
                <button type="submit" class="btn is-danger is-sm" style="display: inline-block">
                    この団体から抜ける
                </button>
            </form-with-confirm>
        @endif
    </app-header>
    <app-container medium>
        <list-view>
            @if(!$group->hasSubmitted())
                <list-view-card>
                    <app-info-box primary>
                        <strong>団体情報の修正や、理大祭参加登録を提出を行えるのは、団体責任者のみです。</strong>
                    </app-info-box>
                </list-view-card>
            @endif
            <list-view-card>
                @include('includes.group_info')
            </list-view-card>
                @if ($group->circle())
                    <list-view-card>
                        @include('includes.circle_with_group_info', ['group' => $group])
                    </list-view-card>
                @endif
        </list-view>
    </app-container>
@endsection
