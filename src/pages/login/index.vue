<template>
    <div class="login-form">
        <!-- <div class="button-wrapper"> -->
        <div class="login-card">
            <div>
                <img src="@/assets/image/i_logo.png" alt="" />
            </div>
            <div class="input-form">
                <input v-model="sLoginName" type="text" placeholder="ID" class="input normal-text" />
                <input v-model="sPassword" type="password" placeholder="Password" class="input normal-text" />
            </div>
            <div class="button-form">
                <button class="login-button" @click="sLogin">LOGIN</button>
            </div>
        </div>
        <!-- </div> -->
    </div>
</template>

<script setup lang="ts" name="Login">
import { ref } from 'vue';
import { postLogin } from '@/api/repository/login';
import router from '../../routes';
import { RouteNames } from '../../enums/routes';
const sLoginName = ref<string>('');
const sPassword = ref<string>('');

const sLogin = async () => {
    const sParams = { loginName: sLoginName.value, password: sPassword.value };

    // API 요청 방지 ID Password check
    if (sParams.loginName === '' || sParams.password === '') {
        alert('typed ID or Password');
        return;
    }

    // api call
    const sReturn = await postLogin(sParams);

    // status 상태에 따라 처리
    if (sReturn?.status === 200) {
        localStorage.setItem('accessToken', sReturn.data.accessToken);
        localStorage.setItem('refreshToken', sReturn.data.refreshToken);
        router.push({
            name: RouteNames.TAG_VIEW,
        });
    } else {
        alert('check ID or Password');
        sPassword.value = '';
    }
};
</script>

<style lang="scss" scoped>
@import 'index.scss';
</style>
