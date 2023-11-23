<template>
    <div class="login-form">
        <form @submit="login" class="login-card">
            <div>
                <img alt="" src="@/assets/image/logo_machbaseNeo_general_a.png" />
            </div>
            <div class="input-form">
                <input v-model="sLoginName" @keydown.enter="login" class="input normal-text" placeholder="ID" type="text" maxlength="40" />
                <input v-model="sPassword" @keydown.enter="login" autocomplete="off" class="input normal-text" placeholder="Password" type="password" maxlength="40" />
            </div>
            <div class="button-form">
                <button :class="sLoginName !== '' && sPassword !== '' ? 'no-input' : 'login-button'" type="submit">LOGIN</button>
            </div>
        </form>
    </div>
</template>

<script setup="setup" lang="ts" name="Login">
import { ref, computed } from 'vue';
import { postLogin } from '@/api/repository/login';
import router from '../../routes';
import { RouteNames } from '../../enums/routes';
import { toast, ToastOptions } from 'vue3-toastify';
import { store } from '../../store';
const sLoginName = ref<string>('');
const sPassword = ref<string>('');
const cIsDarkMode = computed(() => store.getters.getDarkMode);

const login = async (e: any) => {
    e.preventDefault();
    const sParams = {
        LoginName: sLoginName.value,
        Password: sPassword.value,
    };

    if (sParams.LoginName === '' || sParams.Password === '') {
        toast('typed ID or Password', {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
        return;
    }

    const sReturn: any = await postLogin(sParams);
    if (sReturn && sReturn.success) {
        localStorage.setItem('accessToken', sReturn.accessToken);
        localStorage.setItem('refreshToken', sReturn.refreshToken);
        sReturn.option && sReturn.option.experimentMode ? localStorage.setItem('experimentMode', sReturn.option.experimentMode) : localStorage.removeItem('experimentMode');

        router.push({ name: RouteNames.TAG_VIEW });
    } else {
        toast(sReturn.data.reason, {
            autoClose: 1000,
            theme: cIsDarkMode.value ? 'dark' : 'light',
            position: toast.POSITION.TOP_RIGHT,
            type: 'error',
        } as ToastOptions);
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
