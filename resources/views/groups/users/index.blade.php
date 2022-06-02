@extends('layouts.no_drawer')

@section('title', '理大祭参加登録')

@section('content')
    @include('includes.group_register_header')

    <app-container medium>
        <list-view>
            <template v-slot:title>メンバーを招待</template>
            <template v-slot:description>
                あなたの団体「{{ $group->group_name }}」の理大祭係(副責任者)に、以下のURLを共有してください。これは、理大祭係(副責任者)の招待URLです。
            </template>
            <list-view-form-group label-for="invitation_url">
                <template v-slot:label>
                    招待URL
                </template>
                <template v-slot:description>
                    あなたの団体の部外者にこのURLを教えないでください
                </template>
                <input id="invitation_url" type="text" class="form-control" name="invitation_url"
                       value="{{ $invitation_url }}" readonly>
            </list-view-form-group>
            @if (!empty($qrcode_html))
                <list-view-card>
                    <div class="text-center qrcode-wrap">
                        {!! $qrcode_html !!}
                    </div>
                </list-view-card>
            @endif
            <list-view-action-btn button v-on:click="share({{ $share_json }})" icon-class="far fa-share-square">
                URLを共有
            </list-view-action-btn>
            <form-with-confirm action="{{ route('groups.users.regenerate', ['group' => $group]) }}" method="post"
                               confirm-message="URLを新しくつくりなおすと、既存の招待URLは無効になります。URLを新しくつくりなおしますか？">
                @csrf
                <list-view-action-btn button submit icon-class="fas fa-redo">
                    URLを新しくつくりなおす
                </list-view-action-btn>
            </form-with-confirm>
        </list-view>

        <list-view>
            <template v-slot:title>メンバー一覧</template>
            <template v-slot:description>「{{ $group->group_name }}」に所属するメンバーのリスト</template>

            @foreach($group->users as $user)
                <list-view-item>
                    <template v-slot:title>
                        {{ $user->name }}
                        ({{ $user->student_id }})
                        @if ($user->pivot->is_leader)
                            <app-badge primary>責任者</app-badge>
                        @else
                            <app-badge muted>理大祭係(副責任者)</app-badge>
                        @endif
                    </template>
                    @unless($user->pivot->is_leader)
                        <template v-slot:meta>
                            <form-with-confirm
                                action="{{ route('groups.users.destroy', ['group' => $group, 'user' => $user]) }}"
                                method="post"
                                confirm-message="本当にこのユーザーをメンバーから削除しますか？">
                                @method('delete')
                                @csrf
                                <button type="submit" class="btn is-danger is-sm">
                                    メンバーから削除
                                </button>
                            </form-with-confirm>
                        </template>
                    @endunless
                </list-view-item>
            @endforeach
        </list-view>

        <div class="text-center pt-spacing-md pb-spacing">
            <a href="{{ route('groups.edit', ['group' => $group]) }}"
               class="btn is-secondary">
                <i class="fas fa-chevron-left"></i>
                団体情報の編集
            </a>
            @unless($group->canSubmit())
                <span class="btn is-primary disabled">
                    確認画面へ
                    <i class="fas fa-chevron-right"></i>
                </span>
                <p class="text-danger pt-spacing-sm">
                    理大祭参加登録を提出するには、あと{{ config('portal.users_number_to_submit_circle') - count($group->users) }}人がメンバーになる必要があります。
                </p>
            @else
                <a href="{{ route('groups.confirm', ['group' => $group]) }}" class="btn is-primary">
                    確認画面へ
                    <i class="fas fa-chevron-right"></i>
                </a>
            @endunless
        </div>
    </app-container>
@endsection
