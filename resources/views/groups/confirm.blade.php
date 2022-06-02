@extends('layouts.no_drawer')

@section('title', '理大祭参加登録')

@section('content')
    @include('includes.group_register_header')

    <app-container medium>
        <list-view>
            <template v-slot:title>理大祭参加登録の提出</template>
            <list-view-card>
                以下の情報で理大祭参加登録を提出します。<strong>理大祭参加登録の提出後は、登録内容の変更ができなくなります。</strong>
            </list-view-card>
            <list-view-card>
                @include('includes.group_info')
            </list-view-card>
        </list-view>

        <form action="{{ route('groups.submit', ['group' => $group]) }}" method="post">
            @csrf
            <div class="text-center pt-spacing-sm pb-spacing">
                <a class="btn is-secondary" href="{{ route('groups.users.index', ['group' => $group]) }}">
                    <i class="fas fa-chevron-left"></i>
                    「メンバーを招待」へもどる
                </a>
                <button type="submit" class="btn is-primary">
                    <strong>理大祭参加登録を提出</strong>
                </button>
            </div>
        </form>
    </app-container>
@endsection
