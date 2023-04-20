<template>
    <div class="login-form">
        <!-- <div class="button-wrapper"> -->
        <div class="login-card">
            <div>
                <img alt="" src="@/assets/image/i_logo.png" />
            </div>
            <div class="input-form">
                <input v-model="sLoginName" @keydown.enter="login" class="input normal-text" placeholder="ID" type="text" />
                <input v-model="sPassword" @keydown.enter="login" class="input normal-text" placeholder="Password" type="password" />
            </div>
            <div class="button-form">
                <button @click="login" :class="sLoginName !== '' && sPassword !== '' ? 'no-input' : 'login-button'">LOGIN</button>
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
