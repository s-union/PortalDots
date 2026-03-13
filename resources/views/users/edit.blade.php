@extends('layouts.app')

@section('title', 'ユーザー設定')

@section('content')
    @include('includes.user_settings_tab_strip')
    <form method="POST" action="{{ route('user.update') }}">
        @method('patch')
        @csrf

        <app-container>
            <list-view>
                <template v-slot:title>一般設定</template>

                @if ($circles->isEmpty())
                    <list-view-student-id-and-univemail-input
                        v-bind:allowed-domain-parts="{{ json_encode(config('portal.univemail_domain_part')) }}"
                        v-bind:allow-arbitrary-local-part="{{ config('portal.univemail_local_part') === 'user_id' ? 'true' : 'false' }}"
                        student-id-input-name="student_id" univemail-local-part-input-name="univemail_local_part"
                        univemail-domain-part-input-name="univemail_domain_part"
                        student-id-label="{{ config('portal.student_id_name') }}"
                        univemail-label="{{ config('portal.univemail_name') }}"
                        default-student-id-value="{{ old('student_id', $user->student_id) }}"
                        default-univemail-local-part-value="{{ old('univemail_local_part', $user->univemail_local_part) }}"
                        default-univemail-domain-part-value="{{ old('univemail_domain_part', $user->univemail_domain_part) }}">
                        @error('student_id')
                            <template v-slot:invalid-student-id>{{ $message }}</template>
                        @enderror
                        @error('univemail')
                            <template v-slot:invalid-univemail>{{ $message }}</template>
                        @enderror
                    </list-view-student-id-and-univemail-input>
                @else
                    <list-view-form-group label-for="student_id">
                        <template v-slot:label>{{ config('portal.student_id_name') }}</template>
                        <template v-slot:description>
                            企画に所属しているため修正できません
                        </template>
                        <input id="student_id" type="text" class="form-control" name="student_id"
                            value="{{ $user->student_id }}" readonly>
                    </list-view-form-group>
                    <list-view-form-group label-for="univemail">
                        <template v-slot:label>{{ config('portal.univemail_name') }}</template>
                        <template v-slot:description>
                            企画に所属しているため修正できません
                        </template>
                        <input id="univemail" type="text" class="form-control" name="univemail"
                            value="{{ $user->univemail }}" readonly>
                    </list-view-form-group>
                    <input type="hidden" name="univemail_local_part" value="{{ $user->univemail_local_part }}">
                    <input type="hidden" name="univemail_domain_part" value="{{ $user->univemail_domain_part }}">
                @endif
                <list-view-form-group label-for="name">
                    <template v-slot:label>名前</template>
                    <template v-slot:description>
                        {{ !$circles->isEmpty() ? '企画に所属しているため修正できません' : '姓と名を分けて入力してください' }}
                    </template>
                    <div class="form-split-inputs">
                        <div class="form-split-inputs__item">
                            <label class="form-split-inputs__label" for="name">姓</label>
                            <input id="name" type="text"
                                class="form-control {{ $errors->has('name_family') ? 'is-invalid' : '' }}" name="name_family"
                                value="{{ old('name_family', $user->name_family) }}"
                                {{ !$circles->isEmpty() ? 'readonly' : '' }} required autocomplete="family-name" placeholder="姓">
                        </div>
                        <div class="form-split-inputs__item">
                            <label class="form-split-inputs__label" for="name_given">名</label>
                            <input id="name_given" type="text"
                                class="form-control {{ $errors->has('name_given') ? 'is-invalid' : '' }}" name="name_given"
                                value="{{ old('name_given', $user->name_given) }}"
                                {{ !$circles->isEmpty() ? 'readonly' : '' }} required autocomplete="given-name" placeholder="名">
                        </div>
                    </div>
                    @if ($errors->has('name_family') || $errors->has('name_given'))
                        <template v-slot:invalid>
                            @foreach (array_merge($errors->get('name_family'), $errors->get('name_given')) as $message)
                                <div>{{ $message }}</div>
                            @endforeach
                        </template>
                    @endif
                </list-view-form-group>
                <list-view-form-group label-for="name_yomi">
                    <template v-slot:label>名前(よみ)</template>
                    <template v-slot:description>
                        {{ !$circles->isEmpty() ? '企画に所属しているため修正できません' : '姓と名のよみを分けて入力してください' }}
                    </template>
                    <div class="form-split-inputs">
                        <div class="form-split-inputs__item">
                            <label class="form-split-inputs__label" for="name_yomi">姓(よみ)</label>
                            <input id="name_yomi" type="text"
                                class="form-control {{ $errors->has('name_family_yomi') ? 'is-invalid' : '' }}"
                                name="name_family_yomi" value="{{ old('name_family_yomi', $user->name_family_yomi) }}"
                                {{ !$circles->isEmpty() ? 'readonly' : '' }} required placeholder="せい">
                        </div>
                        <div class="form-split-inputs__item">
                            <label class="form-split-inputs__label" for="name_given_yomi">名(よみ)</label>
                            <input id="name_given_yomi" type="text"
                                class="form-control {{ $errors->has('name_given_yomi') ? 'is-invalid' : '' }}"
                                name="name_given_yomi" value="{{ old('name_given_yomi', $user->name_given_yomi) }}"
                                {{ !$circles->isEmpty() ? 'readonly' : '' }} required placeholder="めい">
                        </div>
                    </div>
                    @if ($errors->has('name_family_yomi') || $errors->has('name_given_yomi'))
                        <template v-slot:invalid>
                            @foreach (array_merge($errors->get('name_family_yomi'), $errors->get('name_given_yomi')) as $message)
                                <div>{{ $message }}</div>
                            @endforeach
                        </template>
                    @endif
                </list-view-form-group>
                <list-view-form-group label-for="email">
                    <template v-slot:label>連絡先メールアドレス</template>
                    <template v-slot:description>
                        連絡先メールアドレスとして{{ config('portal.univemail_name') }}も利用できます
                    </template>
                    <input id="email" type="email" class="form-control @error('email') is-invalid @enderror"
                        name="email" value="{{ old('email', $user->email) }}" required autocomplete="email">
                    @error('email')
                        <template v-slot:invalid>{{ $message }}</template>
                    @enderror
                </list-view-form-group>
                <list-view-form-group label-for="tel">
                    <template v-slot:label>連絡先電話番号</template>
                    <input id="tel" type="tel" class="form-control @error('tel') is-invalid @enderror"
                        name="tel" value="{{ old('tel', $user->tel) }}" required>
                    @error('tel')
                        <template v-slot:invalid>{{ $message }}</template>
                    @enderror
                </list-view-form-group>
            </list-view>

            <list-view>
                <template v-slot:description>変更を保存するには、現在のパスワードを入力してください</template>
                <list-view-form-group label-for="password">
                    <template v-slot:label>現在のパスワード</template>
                    <template v-slot:description>
                        <a href="{{ route('password.request') }}">
                            パスワードをお忘れの場合はこちら
                        </a>
                    </template>
                    <input id="password" type="password" class="form-control @error('password') is-invalid @enderror"
                        name="password" required autocomplete="current-password">
                    @error('password')
                        <template v-slot:invalid>{{ $message }}</template>
                    @enderror
                </list-view-form-group>
            </list-view>

            <div class="text-center pt-spacing-md pb-spacing">
                <button type="submit" class="btn is-primary is-wide">
                    保存
                </button>
            </div>
        </app-container>
    </form>
@endsection
