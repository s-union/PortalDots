@section('no_circle_selector', true)

@php
    $step = 0;
    if (Route::currentRouteName() === 'groups.create' || Route::currentRouteName() === 'groups.edit') {
        $step = 1;
    } elseif (Route::currentRouteName() === 'groups.users.index') {
        $step = 2;
    } elseif (Route::currentRouteName() === 'groups.confirm') {
        $step = 3;
    }
@endphp

<app-header container-medium>
    <template v-slot:title>
        理大祭参加登録
        <small class="text-muted">(ステップ {{ $step }} / 3)</small>
    </template>
    @isset($group)
        <p class="text-muted">
            {{ $group->group_name }}

            @php
                $this_user = $group->users()->wherePivot('user_id', Auth::id())->first()
            @endphp
            @if(!empty($this_user) && $this_user->pivot->is_leader)
                -
                <a href="{{ route('groups.delete', ['group' => $group]) }}">この理大祭参加登録を削除</a>
            @endif
        </p>
    @endisset
    <steps-list>
        <steps-list-item {{ $step === 1 ? 'active' : '' }}>団体情報</steps-list-item>
        <steps-list-item {{ $step === 2 ? 'active' : '' }}>メンバー</steps-list-item>
        <steps-list-item {{ $step === 3 ? 'active' : '' }}>提出</steps-list-item>
    </steps-list>
</app-header>
