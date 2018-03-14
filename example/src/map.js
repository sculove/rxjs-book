import {handleAjax} from "./util.js";

function getRouteTypes(name) {
    if (/^광역/.test(name)) {
        return "yellow";
    } else if (/^직행/.test(name)) {
        return "red";
    } else {
        return "";
    }
}

export default class Map {
    constructor($map) {
        this.naverMap = new naver.maps.Map($map, {
            zoom: 11
        });
        this.infowindow = new naver.maps.InfoWindow();

        const { 
            geolocation$,
            mapClick$,
            markerClick$,
            buses$
        } = this.createStream();

        geolocation$.subscribe({
            next: coords => {
                this.naverMap.setCenter(new naver.maps.LatLng(coords.latitude,
                    coords.longitude)); // 얻은 좌표를 지도의 중심으로 설정합니다.
                this.naverMap.setZoom(11); // 지도의 줌 레벨을 변경합니다.
            },
            error: console.error
        });

        mapClick$.subscribe(coords => {
            this.naverMap.setCenter(new naver.maps.LatLng(coords.latitude,
                coords.longitude));
            this.infowindow.close();
        })

        buses$.subscribe(data => {
            const before = this.infowindow.getPosition();
            const after = data.marker.getPosition();
            if (after.equals(before) && this.infowindow.getMap()) {
                this.infowindow.close();
            } else {
                this.naverMap.panTo(after, { duration: 300 });
                this.infowindow.setContent(this.render(data));
                this.infowindow.open(this.naverMap, data.marker);
            }
        });
        // 버스를 자동완성으로 조회하면 renderSation을 표기하고. 지도를 첫번째 station으로 이동한다.
        // 에러 및 불필요한 동작 제거
    }
    createStream() {
        const geolocation$ = this.createGeolocation$();
        const mapClick$ = this.createMapClick$();
        const makerClick$ = this.createMakerClick$(geolocation$, mapClick$);

        return {
            geolocation$,
            mapClick$,
            makerClick$,
            buses$: this.createBuses$(makerClick$)
        }
    }
    createGeolocation$() {
        // 서울 시청
        const defaultPosition = {
            coords: {
                longitude: 126.9783882,
                latitude: 37.5666103,
            }
        };
        return new Rx.Observable(observer => {
            // geolocation 지원하는 경우 현재 위치를 구함.
            if (navigator.geolocation) {
                window.navigator.geolocation.getCurrentPosition(
                    position => observer.next(position),
                    error => observer.next(defaultPosition),
                    {
                        enableHighAccuracy: false,  // 빠른 응답을 위해 세밀한 정보를 받지는 않음.
                        timeout: 1000               // 1초 내에 답변이 없으면 에러처리 
                    }
                );
            } else {
                observer.next(defaultPosition);
            }
        })
            .pluck("coords")
            .first();
    }
    createMakerClick$(geolocation$, mapClick$) {
        // 지도에 마커를 생성하고 click 이벤트 스트림
        return Rx.Observable.merge(geolocation$, mapClick$)
            // this.geolocation$
            .switchMap(coords => Rx.Observable.ajax.getJSON(`/station/around/${coords.longitude}/${coords.latitude}`))
            .let(handleAjax("busStationAroundList"))
            .mergeMap(stations => Rx.Observable.from(
                stations.map(station => new naver.maps.Marker({
                    map: this.naverMap,
                    title: station.stationName,
                    position: new naver.maps.LatLng(station.y, station.x),
                    id: station.stationId,  // 임의로 저장하는 값 
                    stationName: station.stationName, // 임의로 저장하는 값 
                    mobileNo: station.mobileNo, // 임의로 저장하는 값 
                }))
            ))
            .mergeMap(marker => Rx.Observable.fromEvent(marker, "click"))
            .map(event => {
                return {
                    marker: event.overlay,
                    position: event.overlay.getPosition(),
                    // 사용자 정보 (하위)
                    id: event.overlay.getOptions("id"),
                    stationName: event.overlay.getOptions("stationName"),
                    mobileNo: event.overlay.getOptions("mobileNo"),
                }
            })
            .share()    // 왜 필요하지?
    }
    createBuses$(markerClick$) {
        // stationId를 통해 해당 역을 지나가는 버스 리스트 조회 스트림
        return markerClick$
            .switchMap(({ id }) => Rx.Observable.ajax.getJSON(`/bus/pass/station/${id}`))
            .let(handleAjax("busRouteList"))
            .withLatestFrom(markerClick$, (routes, markerInfo) => ({
                ...markerInfo,
                routes,
            }))
            .filter(({ mobileNo }) => !!mobileNo);
    }
    createMapClick$() {
        return Rx.Observable.fromEvent(this.naverMap, "click")
            .map(({ coord }) => ({
                longitude: coord.x,
                latitude: coord.y
            }));
    }

    // infowindow에 표기할 정류소를 지나가는 버스들 표시
    render({stationName, mobileNo, routes}) {
        let list = routes.map(route => (`<dd>
                <a href="#${route.routeId}_${route.routeName}"><strong>${route.routeName}</strong> <span>${route.regionName}</span> <span class="type ${getRouteTypes(route.routeTypeName)}">${route.routeTypeName}</span></a>
            </dd>`)).join("");

        return `<dl class="bus-routes">
            <dt><strong>${stationName}</strong> <span>(${mobileNo})</span></dt>${list}
        </dl>`;
    }
}
