<list-view-student-id-and-univemail-input
    v-bind:allowed-domain-parts="{{ json_encode(config('portal.univemail_domain_part')) }}"
    v-bind:allow-arbitrary-local-part="{{ config('portal.univemail_local_part') === 'user_id' ? 'true' : 'false' }}"
    student-id-input-name="student_id" univemail-local-part-input-name="univemail_local_part"
    univemail-domain-part-input-name="univemail_domain_part" student-id-label="{{ config('portal.student_id_name') }}"
    univemail-label="{{ config('portal.univemail_name') }}" default-student-id-value="{{ old('student_id') }}"
    default-univemail-local-part-value="{{ old('univemail_local_part') }}"
    default-univemail-domain-part-value="{{ old('univemail_domain_part') }}">
    @error('student_id')
        <template v-slot:invalid-student-id>{{ $message }}</template>
    @enderror
    @error('univemail')
        <template v-slot:invalid-univemail>{{ $message }}</template>
    @enderror
</list-view-student-id-and-univemail-input>
<list-view-form-group label-for="name">
    <template v-slot:label>名前</template>
    <template v-slot:description>
        姓と名を分けて入力してください
    </template>
    <div class="form-split-inputs">
        <div class="form-split-inputs__item">
            <label class="form-split-inputs__label" for="name">姓</label>
            <input id="name" type="text"
                class="form-control {{ $errors->has('name_family') ? 'is-invalid' : '' }}" name="name_family"
                value="{{ old('name_family') }}" required autocomplete="family-name" placeholder="姓">
        </div>
        <div class="form-split-inputs__item">
            <label class="form-split-inputs__label" for="name_given">名</label>
            <input id="name_given" type="text"
                class="form-control {{ $errors->has('name_given') ? 'is-invalid' : '' }}" name="name_given"
                value="{{ old('name_given') }}" required autocomplete="given-name" placeholder="名">
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
        姓と名のよみを分けて入力してください
    </template>
    <div class="form-split-inputs">
        <div class="form-split-inputs__item">
            <label class="form-split-inputs__label" for="name_yomi">姓(よみ)</label>
            <input id="name_yomi" type="text"
                class="form-control {{ $errors->has('name_family_yomi') ? 'is-invalid' : '' }}" name="name_family_yomi"
                value="{{ old('name_family_yomi') }}" required placeholder="せい">
        </div>
        <div class="form-split-inputs__item">
            <label class="form-split-inputs__label" for="name_given_yomi">名(よみ)</label>
            <input id="name_given_yomi" type="text"
                class="form-control {{ $errors->has('name_given_yomi') ? 'is-invalid' : '' }}" name="name_given_yomi"
                value="{{ old('name_given_yomi') }}" required placeholder="めい">
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
    <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email"
        value="{{ old('email') }}" required autocomplete="email">
    @error('email')
        <template v-slot:invalid>{{ $message }}</template>
    @enderror
</list-view-form-group>
<list-view-form-group label-for="tel">
    <template v-slot:label>連絡先電話番号</template>
    <input id="tel" type="tel" class="form-control @error('tel') is-invalid @enderror" name="tel"
        value="{{ old('tel') }}" required>
    @error('tel')
        <template v-slot:invalid>{{ $message }}</template>
    @enderror
</list-view-form-group>
<list-view-form-group label-for="password">
    <template v-slot:label>パスワード</template>
    <template v-slot:description>8文字以上で入力してください</template>
    <input id="password" type="password" class="form-control @error('password') is-invalid @enderror" name="password"
        required autocomplete="new-password">
    @error('password')
        <template v-slot:invalid>{{ $message }}</template>
    @enderror
</list-view-form-group>
<list-view-form-group label-for="password_confirmation">
    <template v-slot:label>パスワード(確認)</template>
    <template v-slot:description>確認のため、パスワードをもう一度入力してください</template>
    <input id="password_confirmation" type="password" class="form-control @error('password') is-invalid @enderror"
        name="password_confirmation" required autocomplete="new-password">
</list-view-form-group>
