export enum ResType {
    msg = 'msg',
    data = 'data',
    list = 'list',
    success = 'success',
}

export enum ResStatus {
    success = 'success',
    fail = 'fail',
}

// API Response
// function ResponsePattern<Type>(aResult: AxiosResponse<Type>, aType: ResType): Type | string {
function ResponseData<Type>(aResult: any, aType: ResType): Type {
    const sData: Type = aResult.data;
    if (aType === ResType.data) {
        if (aResult.success === true) {
            return sData;
        } else {
            throw Error(aResult.msg);
        }
    } else {
        return aResult.success;
    }
}
function ResponseList<Type>(aResult: any, aType: ResType): Type {
    const sData: Type = aResult.list;
    if (aType === ResType.list) {
        if (aResult.success === true) {
            return sData;
        } else {
            throw Error(aResult.msg);
        }
    } else {
        return aResult.success;
    }
}

export { ResponseData, ResponseList };
