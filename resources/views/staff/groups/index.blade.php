@extends('layouts.app')

@section('title', '団体情報管理')

@section('content')
    <staff-grid
        api-url="{{ route('staff.groups.api') }}"
        v-bind:key-translations="{
            id: '団体ID',
            group_name: '団体名',
            group_name_yomi: '団体名(よみ)',
            submitted_at: '提出日時',
            created_at: '作成日時',
            updated_at: '更新日時',
        }"
    >
        <template v-slot:toolbar>
            @can('staff.groups.create')
                <a class="btn is-primary" href="{{ route('staff.groups.create') }}">
                    <i class="fas fa-plus fa-fw"></i>
                    新規団体
                </a>
            @endcan
        </template>
        <template v-slot:activities="{ row, openEditorByUrl }">
            <form-with-confirm
                v-bind:action="`{{ route('staff.groups.destroy', ['group' => '%%GROUP%%']) }}`.replace('%%GROUP%%', row['id'])"
                method="post" v-bind:confirm-message="`団体「${row['group_name']}」を削除しますか？`">
                @method('delete')
                @csrf
                @can('staff.groups.edit')
                    <icon-button
                        button
                        v-on:click="() => openEditorByUrl(`{{ route('staff.groups.edit', ['group' => '%%GROUP%%']) }}`.replace('%%GROUP%%', row['id']))"
                        title="編集">
                        <i class="fas fa-pencil-alt fa-fw"></i>
                    </icon-button>
                @endcan
                @can('staff.groups.delete')
                    <icon-button submit title="削除">
                        <i class="fas fa-trash fa-fw"></i>
                    </icon-button>
                @endcan
            </form-with-confirm>
        </template>
        <template v-slot:td="{ row, keyName }">
            @{{ row[keyName] }}
        </template>
    </staff-grid>
@endsection
