<template>
    <div class="login-form">
        <!-- <div class="button-wrapper"> -->
        <div class="login-card">
            <div>
                <img src="@/assets/image/i_logo.png" alt="" />
            </div>
            <div class="input-form">
                <input v-model="sLoginName" type="text" placeholder="ID" class="input normal-text" @keydown.enter="login" />
                <input v-model="sPassword" type="password" placeholder="Password" class="input normal-text" @keydown.enter="login" />
            </div>
            <div class="button-form">
                <button :class="sLoginName !== '' && sPassword !== '' ? 'no-input' : 'login-button'" @click="login">LOGIN</button>
            </div>
        </div>
        <!-- </div> -->
    </div>
</template>

<script setup="setup" lang="ts" name="Login">
import { ref } from 'vue';
import { postLogin } from '@/api/repository/login';
import router from '../../routes';
import { RouteNames } from '../../enums/routes';
const sLoginName = ref<string>('');
const sPassword = ref<string>('');

const login = async () => {
    const sParams = {
        LoginName: sLoginName.value,
        Password: sPassword.value,
    };

    // API 요청 방지 ID Password check
    if (sParams.LoginName === '' || sParams.Password === '') {
        alert('typed ID or Password');
        return;
    }

    // api call
    const sReturn: any = await postLogin(sParams);

    // status 상태에 따라 처리
    if (sReturn && sReturn.success) {
        localStorage.setItem('accessToken', sReturn.accessToken);
        localStorage.setItem('refreshToken', sReturn.refreshToken);
        router.push({ name: RouteNames.TAG_VIEW });
    } else {
        sPassword.value = '';
    }
};
</script>

<style lang="scss" scoped="scoped">
@import 'index.scss';
</style>
