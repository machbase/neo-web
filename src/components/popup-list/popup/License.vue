<template>
    <div v-if="sLicenseData" class="license-form">
        <div class="row">
            <div>Type</div>
            <div>
                {{ sLicenseData.type }}
            </div>
        </div>
        <v-divider></v-divider>
        <div class="row">
            <div>Customer</div>
            <div>
                {{ sLicenseData.customer }}
            </div>
        </div>
        <v-divider></v-divider>
        <div class="row">
            <div>Country Code</div>
            <div>
                {{ sLicenseData.countryCode }}
            </div>
        </div>
        <v-divider></v-divider>
        <div class="row">
            <div>Project</div>
            <div>
                {{ sLicenseData.project }}
            </div>
        </div>
        <v-divider></v-divider>
        <div class="row">
            <div>Install Date</div>
            <div>
                {{ sLicenseData.installDate }}
            </div>
        </div>
        <v-divider></v-divider>
        <div class="row">
            <div>Issue Date</div>
            <div>
                {{ Number(sLicenseData.issueDate) > 20990000 ? '' : Number(sLicenseData.issueDate) }}
            </div>
        </div>
        <v-divider></v-divider>
        <div class="row">
            <div>
                <label class="item">
                    <div :style="{ display: 'flex', alignItems: 'center', cursor: 'pointer' }">
                        <v-icon class="file-import-icon" icon="mdi-link-box-variant" size="16px"> </v-icon>
                        Register license...
                    </div>
                    <input @change="onUploadChart" accept="*" class="file-import" type="file" />
                </label>
            </div>
            <div class="popup__btn-group">
                <v-btn @click="onClosePopup" class="button-effect" variant="outlined"> Cancel </v-btn>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" name="NewTags">
import { computed, defineEmits, onMounted, reactive, ref, watch, defineProps, withDefaults, toRefs } from 'vue';
import { getLicense, postLicense } from '../../../api/repository/api';

interface NewTagProps {
    noOfSelectTags: number;
}
const sLicenseData = ref();
const props = defineProps<NewTagProps>();

const emit = defineEmits(['eClosePopup', 'eSubmit']);

const onUploadChart = async (aEvent: any) => {
    let sFormData = new FormData();
    const files = aEvent.target.files[0];

    sFormData.append('license.dat', files);

    const sResult: any = await postLicense(sFormData);

    if (sResult.success) {
        alert('success');
    } else {
        alert('fail');
    }
};

const onClosePopup = () => {
    emit('eClosePopup');
};
const init = async () => {
    const sData: any = await getLicense();
    if (sData.reason === 'success') sLicenseData.value = sData.data;
};

onMounted(() => {
    init();
});
</script>

<style lang="scss" scoped>
@import 'index.scss';
.popup__btn-group {
    margin: 0 !important;
}
</style>
