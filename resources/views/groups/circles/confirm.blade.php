@extends('layouts.no_drawer')

@section('title', '企画参加登録')

@section('content')
    @include('includes.circle_register_with_group_header')

    <app-container medium>
        <list-view>
            <template v-slot:title>企画参加登録の提出</template>
            <list-view-card>
                以下の情報で企画参加登録を提出します。<strong>企画参加登録の提出後は、登録内容の変更ができなくなります。</strong>
            </list-view-card>
            <list-view-card>
                @include('includes.group_info')
            </list-view-card>
            <list-view-card>
                @include('includes.circle_with_group_info')
            </list-view-card>
        </list-view>

        <form action="{{ route('groups.circles.submit', ['group' => $group]) }}" method="post">
            @csrf
            <div class="text-center pt-spacing-sm pb-spacing">
                <a class="btn is-secondary" href="{{ route('groups.circles.edit', ['group' => $group]) }}">
                    <i class="fas fa-chevron-left">
                        「企画情報」の入力へもどる
                    </i>
                </a>
                <button type="submit" class="btn is-primary">
                    <strong>企画参加登録を提出</strong>
                </button>
            </div>
        </form>
    </app-container>
@endsection
