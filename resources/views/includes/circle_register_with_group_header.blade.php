@section('no_circle_selector', true)

@php
$step = 0;
if (Route::currentRouteName() === 'circles.create' || Route::currentRouteName() === 'circles.edit') {
$step = 1;
} elseif (Route::currentRouteName() === 'groups.circles.confirm') {
$step = 2;
}
@endphp

<app-header container-medium>
    <template v-slot:title>
        企画参加登録
        <small class="text-muted">(ステップ {{ $step }} / 2)</small>
    </template>
    @isset ($circle)
        <p class="text-muted">
            {{ $circle->name }}

            @php
            $this_user = $circle->users()->wherePivot('user_id', Auth::id())->first();
            @endphp

            @if (!empty($this_user) && $this_user->pivot->is_leader)
                —
                <a href="{{ route('circles.delete', ['circle' => $circle]) }}">この参加登録を削除</a>
            @endif
        </p>
    @endisset
    <steps-list>
        <steps-list-item {{ $step === 1 ? 'active' : '' }}>企画情報</steps-list-item>
        <steps-list-item {{ $step === 2 ? 'active' : '' }}>提出</steps-list-item>
    </steps-list>
</app-header>
