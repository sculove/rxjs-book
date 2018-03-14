require("isomorphic-fetch");
const express = require("express");
const app = express();
const x2j = require("xml2json");
const Rx = require("rxjs/Rx");

// 사용자 키 (공공데이터)
const SERVICE_KEY = "MpmiwfwaQQGY9aZEbmf2UwD4K0mOx7X5H4twJWlLYCQ7h8GH0Rypsi41pMDm67H4f0bjtiSk1NUVsWS5PyOkpw%3D%3D";

app.use(express.static("./"));

function createRemote$(url) {
  return Rx.Observable
  .fromPromise(fetch(url))
  .switchMap(response => response.text())
  .map(text => {
    const response = x2j.toJson(text, {object: true}).response;
    const header = response.msgHeader;
    if(header.resultCode === "0") {
      return response.msgBody;
    } else {
      return Rx.Observable.throw({
        code: header.resultCode,
        messge: header.resultMessage
      });
    }
  })
  .take(1)
}

const regexp = /:(\w+)/gi;
const routes = {
  // [버스노선 조회 (경기도)] https://www.data.go.kr/subMain.jsp#/L3B1YnIvcG90L215cC9Jcm9zTXlQYWdlL29wZW5EZXZEZXRhaWxQYWdlJEBeMDgyTTAwMDAxMzBeTTAwMDAxMzUkQF5wdWJsaWNEYXRhRGV0YWlsUGs9dWRkaTo4MTZiYjVjMy1mMDg5LTRkMmYtYTQ4MC1iMDNkNmVlYTc2MGUkQF5wcmN1c2VSZXFzdFNlcU5vPTMzNTQ4MjckQF5yZXFzdFN0ZXBDb2RlPVNUQ0QwMQ==
  // http://localhost:3000/bus/15 버스번호(routeName)로 버스 리스트 조회 (자동완성)
  "/bus/:keyword": {
    url: "http://openapi.gbis.go.kr/ws/rest/busrouteservice"
  },
  // [정류소조회서비스 (경기도)] https://www.data.go.kr/subMain.jsp#/L3B1YnIvcG90L215cC9Jcm9zTXlQYWdlL29wZW5EZXZEZXRhaWxQYWdlJEBeMDgyTTAwMDAxMzBeTTAwMDAxMzUkQF5wdWJsaWNEYXRhRGV0YWlsUGs9dWRkaTo3ZDFkOThjMC1hYzNlLTQxYzUtOTFmYi1jMTc0MzlhY2FjMGQkQF5wcmN1c2VSZXFzdFNlcU5vPTMzNTQ4MzMkQF5yZXFzdFN0ZXBDb2RlPVNUQ0QwMQ==
  // 정류소경유노선목록조회: 해당 정류소를 경유하는 모든 노선정보(노선번호, ID, 유형, 운행지역 등)를 제공한다.
  // http://localhost:3000/bus/pass/station/231000300 버스정류소(stationId)를 거쳐가는 버스번호(routeName) 리스트 조회
  "/bus/pass/station/:stationId": {
    url: "http://openapi.gbis.go.kr/ws/rest/busstationservice/route"
  },
  // [버스노선 조회 (경기도)] https://www.data.go.kr/subMain.jsp#/L3B1YnIvcG90L215cC9Jcm9zTXlQYWdlL29wZW5EZXZEZXRhaWxQYWdlJEBeMDgyTTAwMDAxMzBeTTAwMDAxMzUkQF5wdWJsaWNEYXRhRGV0YWlsUGs9dWRkaTo4MTZiYjVjMy1mMDg5LTRkMmYtYTQ4MC1iMDNkNmVlYTc2MGUkQF5wcmN1c2VSZXFzdFNlcU5vPTMzNTQ4MjckQF5yZXFzdFN0ZXBDb2RlPVNUQ0QwMQ==
  // 경유정류소목록조회: 해당 노선이 정차하는 경유정류소 목록과 정류소명, 중앙차로여부, 회차점, 좌표값 등을 제공한다.
  // http://localhost:3000/station/pass/231000029 버스 노선(routeId)으로 정류소 리스트 조회
  "/station/pass/:routeId": {
    url: "http://openapi.gbis.go.kr/ws/rest/busrouteservice/station"
  },
  // [정류소조회서비스 (경기도)] https://www.data.go.kr/subMain.jsp#/L3B1YnIvcG90L215cC9Jcm9zTXlQYWdlL29wZW5EZXZEZXRhaWxQYWdlJEBeMDgyTTAwMDAxMzBeTTAwMDAxMzUkQF5wdWJsaWNEYXRhRGV0YWlsUGs9dWRkaTo3ZDFkOThjMC1hYzNlLTQxYzUtOTFmYi1jMTc0MzlhY2FjMGQkQF5wcmN1c2VSZXFzdFNlcU5vPTMzNTQ4MzMkQF5yZXFzdFN0ZXBDb2RlPVNUQ0QwMQ==
  // 주변정류소목록조회: 위치 좌표(WGS84) 변경 200m내에 있는 정류소 목록(정류소명, ID, 정류소번호, 좌표값, 중양차로여부 등)를 제공한다.
  // http://localhost:3000/station/around/127.10989/37.03808 위치좌표 주변 정류소 리스트 조회
  "/station/around/:x/:y": {
    url: "http://openapi.gbis.go.kr/ws/rest/busstationservice/searcharound"
  }
};

Object.keys(routes).forEach(path => {
  app.get(path, function(req, res) {
    let match;
    let param;
    const params = [];
    while(match = regexp.exec(path)) {
      param = match[1];
      params.push(`&${param}=${req.params[param]}`);
    }
    createRemote$(routes[path].url + `?serviceKey=${SERVICE_KEY}${params.join("")}`)
      .subscribe(data => res.json(data));
  });
});

app.listen(3000, function () {
  console.log("Server listening on port 3000!");
});
