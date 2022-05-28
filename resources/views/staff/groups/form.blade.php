@extends('layouts.app')

@section('title', empty($group) ? '新規作成 - 団体' : "{$group->group_name} - 団体情報")

@section('navbar')
    <app-nav-bar-back href="{{ route('staff.groups.index') }}">
        団体情報管理
    </app-nav-bar-back>
@endsection

@section('content')
    <form method="post"
          action="{{ empty($group) ? route('staff.groups.store') : route('staff.groups.update', $group) }}">
        @method(empty($group) ? 'post' : 'patch')
        @csrf

        <app-header>
            @if (empty($group))
                <template v-slot:title>団体を新規作成</template>
            @else
                <template v-slot:title>団体情報を編集</template>
                <div>団体ID : {{ $group->id }}</div>
            @endif
        </app-header>

        <app-container>
            <list-view>
                <template v-slot:title>団体情報</template>
                @foreach([
                    'group_name' => '団体名',
                    'group_name_yomi' => '団体名(よみ)'
                ] as $field_name => $display_name)
                    <list-view-form-group label-for="{{ $field_name }}">
                        <template v-slot:label>
                            {{ $display_name }}
                            <app-badge danger>必須</app-badge>
                        </template>
                        <input id="{{ $field_name }}" class="form-control @error($field_name) is-invalid @enderror"
                               type="text" name="{{ $field_name }}"
                               value="{{ old($field_name, empty($group) ? '' : $group->$field_name) }}" required>
                        @if ($errors->has($field_name))
                            <template v-slot:invalid>
                                @foreach($errors->get($field_name) as $message)
                                    {{ $message }}
                                @endforeach
                            </template>
                        @endif
                    </list-view-form-group>
                @endforeach
            </list-view>

            <list-view>
                <template v-slot:title>団体のメンバー</template>
                <list-view-form-group label-for="leader">
                    <template v-slot:label>
                        責任者の{{ config('portal.student_id_name') }}
                    </template>
                    <input type="text" class="form-control @error('leader') is-invalid @enderror" id="leader" name="leader"
                           value="{{ old('leader', empty($leader) ? '' : $leader->student_id) }}">
                    @if ($errors->has('leader'))
                        <template v-slot:invalid>
                            @foreach ($errors->get('leader') as $message)
                                <div>{{ $message }}</div>
                            @endforeach
                        </template>
                    @endif
                </list-view-form-group>
                <list-view-form-group label-for="members">
                    <template v-slot:label>学園祭係(副責任者)の{{ config('portal.student_id_name') }}</template>
                    <template
                        v-slot:description>{{ config('portal.student_id_name') }}を改行して入力することで複数の学園祭係を追加できます。{{ config('portal.users_number_to_submit_circle') - 1 }}人を下回っていても構いません。</template>
                    <textarea id="members" class="form-control @error('members') is-invalid @enderror" name="members"
                              rows="3">{{ old('members', empty($members) ? '' : $members) }}</textarea>
                    @if ($errors->has('members'))
                        <template v-slot:invalid>
                            @foreach ($errors->get('members') as $message)
                                <div>{{ $message }}</div>
                            @endforeach
                        </template>
                    @endif
                </list-view-form-group>
            </list-view>

            <app-fixed-form-footer>
                <button type="submit" class="btn is-primary is-wide">保存</button>
            </app-fixed-form-footer>
        </app-container>
    </form>
@endsection
