/**
 * json 통신 결과로 얻은 데이터를 처리하는 유틸
 * 
 * @export
 * @param {any} property json으로 받아오는 데이터 속성명
 * @returns 
 */
export function handleAjax(property) {
    return obs$ => obs$.mergeMap(jsonRes => {
        if (jsonRes.error) {
            if (jsonRes.error.code === "4") {   // 결과가 존재하지 않는 경우
                return Rx.Observable.of([]);
            } else {
                return Rx.Observable.throw(jsonRes.error);
            }
        } else {
            if (Array.isArray(jsonRes[property])) {
                return Rx.Observable.of(jsonRes[property]);
            } else {
                return Rx.Observable.of([jsonRes[property]]);   // 1건만 전달된 경우 객체로 넘겨져 옮.
            }
        }
    });
}