@extends('layouts.no_drawer')

@section('title', '理大祭参加登録')

@section('content')
    @include('includes.group_register_header')

    <form method="post" action="{{ empty($group) ? route('groups.store') : route('groups.update', [$group]) }}"
        enctype="multipart/form-data">
        @csrf
        @method(empty($group) ? 'post' : 'patch')

        <app-container medium>
            <list-view>
                <template v-slot:title>団体情報を入力</template>
                <template v-slot:description>理大祭に参加する団体の情報を入力してください。</template>
                <list-view-card>
                    <app-info-box primary>
                        団体情報の入力は、団体責任者の方が行ってください。団体責任者以外の方は、団体情報の入力は不要です。団体責任者の方の指示に従ってください。
                    </app-info-box>
                    <list-view-form-group label-for="leader">
                        <template v-slot:label>団体責任者</template>
                        <input type="text" id="leader" readonly
                               value="{{ isset($group) ? $group->leader->first()->name : Auth::user()->name }}"
                               class="form-control is-plaintext">
                    </list-view-form-group>
                    <list-view-form-group label-for="group_name">
                        <template v-slot:label>
                            団体名
                            <app-badge danger>必須</app-badge>
                        </template>
                        <input id="group_name" type="text" class="form-control @error('group_name') is-invalid @enderror"
                               name="group_name"
                               value="{{ old('group_name', isset($group) ? $group->group_name : '') }}" required>
                        @error('group_name')
                            <template v-slot:invalid>{{ $message }}</template>
                        @enderror
                    </list-view-form-group>
                    <list-view-form-group label-for="group_name_yomi">
                        <template v-slot:label>
                            団体名(よみ)
                            <app-badge danger>必須</app-badge>
                        </template>
                        <input id="group_name_yomi" type="text" class="form-control @error('group_name_yomi') is-invalid @enderror"
                               name="group_name_yomi" value="{{ old('group_name_yomi', isset($group) ? $group->group_name_yomi : '') }}"
                               required>
                        @error('group_name_yomi')
                        <template v-slot:invalid>{{ $message }}</template>
                        @enderror
                    </list-view-form-group>
                </list-view-card>
            </list-view>

            <div class="text-center pt-spacing-md pb-spacing">
                <button type="submit" class="btn is-primary is-wide">
                    保存して次へ
                    <i class="fas fa-chevron-right"></i>
                </button>
                @if (config('app.debug'))
                    <button type="submit" class="btn is-primary-inverse" formnovalidate>
                        <app-badge primary strong>開発モード</app-badge>
                        バリデーションせずに送信
                    </button>
                @endif
            </div>
        </app-container>
    </form>
@endsection
