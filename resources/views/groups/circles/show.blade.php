@extends('layouts.no_drawer')

@section('no_circle_selector', true)

@section('title', '企画情報詳細')

@section('content')
    <app-header container-medium>
        <template v-slot:title>企画情報詳細</template>
        <span class="text-muted">
            {{ $group->group_name }}
            @if (!$circle->hasSubmitted())
                <app-badge muted outline>未提出</app-badge>
            @elseif ($circle->isPending())
                <app-badge danger outline>企画参加登録費支払い待ち</app-badge>
            @elseif ($circle->hasApproved())
                <app-badge success>受理</app-badge>
            @endif
        </span>
    </app-header>
    <app-container medium>
        <list-view>
            <list-view-card>
                @include('includes.group_info')
            </list-view-card>
            <list-view-card>
                @include('includes.circle_with_group_info')
            </list-view-card>
        </list-view>
    </app-container>
@endsection
