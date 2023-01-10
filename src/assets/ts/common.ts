export enum ResType {
    data = 'data',
    status = 'status',
}

export enum ResStatus {
    success = 'success',
    fail = 'fail',
}

// API Response
// function ResponsePattern<Type>(aResult: AxiosResponse<Type>, aType: ResType): Type | string {
function ResponsePattern<Type>(aResult: any, aType: ResType): Type | string {
    const sData: Type = aResult.data;

    if (aType === ResType.data) {
        if (aResult.status === ResStatus.success) {
            return sData;
        } else {
            throw Error(aResult.message);
        }
    } else {
        return aResult.status;
    }
}

export { ResponsePattern };
