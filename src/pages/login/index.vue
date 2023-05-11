<template>
    <div class="login-form">
        <div class="login-card">
            <div>
                <img alt="" src="@/assets/image/logo_machbaseNeo_general_a.png" />
            </div>
            <div class="input-form">
                <input v-model="sLoginName" @keydown.enter="login" class="input normal-text" placeholder="ID" type="text" />
                <input v-model="sPassword" @keydown.enter="login" class="input normal-text" placeholder="Password" type="password" />
            </div>
            <div class="button-form">
                <button @click="login" :class="sLoginName !== '' && sPassword !== '' ? 'no-input' : 'login-button'">LOGIN</button>
            </div>
        </div>
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
    if (sParams.LoginName === '' || sParams.Password === '') {
        alert('typed ID or Password');
        return;
    }
    const sReturn: any = await postLogin(sParams);
    if (sReturn && sReturn.success) {
        localStorage.setItem('accessToken', sReturn.accessToken);
        localStorage.setItem('refreshToken', sReturn.refreshToken);
        router.push({ name: RouteNames.TAG_VIEW });
    } else {
        alert(sReturn.data.reason);
        sPassword.value = '';
    }
};
</script>

<style lang="scss" scoped="scoped">
@import 'index.scss';
.login-card div {
    display: flex;
    justify-content: center;
    img {
        width: 80%;
    }
}
</style>
