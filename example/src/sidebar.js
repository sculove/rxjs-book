import { handleAjax} from "./util.js";

export default class Sidebar {
    constructor($sidebar, map) {
        this.$sidebar = $sidebar;
        this.$list = $sidebar.querySelector("ul");
        this.$title = $sidebar.querySelector(".title");
        this.$close = $sidebar.querySelector(".close");
        this.map = map.naverMap;

        const {
            url$,
            close$
        } = this.createStream();
        
        url$.subscribe(stations => {
            if (stations.length) {
                this.render(stations);
            } else {
                this.close();
            }
        });
        close$.subscribe(() => this.close());
    }
    createStream() {
        return {
            close$: Rx.Observable.fromEvent(this.$close, "click"),
            url$: this.createUrl$()
        };
    }
    createUrl$() {
        // stationId_routeNum
        return Rx.Observable.merge(
            Rx.Observable.fromEvent(window, "hashchange"),
            Rx.Observable.fromEvent(window, "load")
        )
            .map(() => location.hash.substring(1).split("_").shift())   // id
            .filter(id => !!id)
            .switchMap(id => Rx.Observable.ajax.getJSON(`/station/pass/${id}`))
            .let(handleAjax("busRouteStationList"))
            .map(stations => stations.filter(station => !!station.mobileNo));
    }
    render(stations) {
        // list에 표기할 버스가 지나가는 정류소들 표시
        this.$list.innerHTML = stations.map(station => `<li>
            <div class="line">
                <span class="line_detail"></span>
                <span class="direction">
                    <i class="fas fa-chevron-circle-down"></i>
                </span>
            </div>
            <div class="text">
                <strong>${station.stationName}</strong>
                <span>${station.mobileNo}</span>
            </div>
        </li>`).join("");
        this.$title.innerHTML = `${location.hash.split("_").pop()} 버스 노선`;
        this.$sidebar.style.display = "block";
        this.drawPath(stations);
    }
    drawPath(stations) {
        // 경로를 지도에 표시한다.
        // https://navermaps.github.io/maps.js/docs/tutorial-polyline-dynamic.example.html
        // 기존 패스 삭제
        this.polyline && this.polyline.setMap(null);
        this.polyline = new naver.maps.Polyline({
            map: this.map,
            path: [],
            strokeColor: "#386de8",
            strokeWeight: 5,
            strokeStyle: "shortdash"
        });
        // 패스 그리기 
        const path = this.polyline.getPath();
        stations.forEach(station => {
            path.push(new naver.maps.LatLng(station.y, station.x))
        });
    }
    close() {
        // 기존 패스 삭제
        this.polyline && this.polyline.setMap(null);
        this.$sidebar.style.display = "none";
    }
};
