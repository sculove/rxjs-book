import {handleAjax} from "./util.js"

export default class AutoComplete {
  constructor($autocomplete) {
    this.$input = $autocomplete.querySelector("input");
    this.$layer = $autocomplete.querySelector(".layer"); 
    this.$loading = $autocomplete.querySelector(".loading");
    this.createStream();
  }
  createStream() {
    const keyup$ = Rx.Observable
      .fromEvent(this.$input, "keyup")
      .debounceTime(300) // 300ms 뒤에 하자.
      .map(event => event.target.value)
      .distinctUntilChanged() // 특수키가 입력된 경우에는 나오지 않게.
      .share();

    const [search$, reset$] = keyup$.partition(query => query.trim().length > 0)

    // 검색어가 입력된 경우
    search$
      .do(() => this.showLoading())
      .switchMap(query => Rx.Observable.ajax.getJSON(`/bus/${query}`))
      .let(handleAjax("busRouteList"))
      .retry(2)
      .do(() => this.hideLoading())
      .finally(() => this.reset())
      .subscribe({
        next: items => this.render(items),
        error: console.error
      });

    // 검색어가 다 지워진 경우(reset$)와 검색결과 창을 클릭한 경우
    Rx.Observable.merge(reset$, Rx.Observable.fromEvent(this.$layer, "click", (evt) => evt.target.closest("li")))
      .filter(el => el !== null)
      .subscribe(v => this.reset());
  }
  showLoading() {
    this.$loading.style.display = "block";
  }
  hideLoading() {
    this.$loading.style.display = "none";
  }
  reset() {
    this.hideLoading();
    this.$layer.style.display = "none";
  }
  render(buses) {
    this.$layer.innerHTML = buses.map(bus => {
      return `<li>
        <a href="#${bus.routeId}_${bus.routeName}">
          <strong>${bus.routeName}</strong>
          <span>${bus.regionName}</span>
          <div>${bus.routeTypeName}</div>
        </a>
      </li>`;
    }).join("");
    this.$layer.style.display = "block";
  }
};
