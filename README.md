# 열기지도 프론트엔드 (yeolgi-map-frontend)

대구 원도심의 "지금 살아 있는 현장"을 온도로 보여주는 열기지도의 모바일 웹 화면입니다. Next.js + Tailwind + MapLibre(OpenFreeMap 타일).

- API는 [DoDandi/yeolgi-backend](https://github.com/DoDandi/yeolgi-backend) 저장소에 있습니다.
- 화면 코드는 지금처럼 `/api/...`로 부르고, `next.config.ts`의 rewrites가 이 요청을 `BACKEND_URL`로 넘겨줍니다. 그래서 CORS 설정이 필요 없습니다.
- 원래 하나였던 프로토타입(`Kjaemin339/yeolgi-map` 커밋 `4418821`)을 백엔드·프론트로 나눈 것입니다.
- 전체 명세는 `CLAUDE.md`, 최신 결정 사항은 `docs/`와 노션 "현재 진행 상황 공유" 페이지를 봅니다. **`CLAUDE.md`는 10/30 명세라 11/7 결정(도 단위 10° 기준, 지도 A안 등)과 다른 부분이 있습니다.**

## 시작하기

1. 백엔드 저장소를 받아 `npm run dev -- -p 4000`으로 띄우기
2. `.env.local.example`을 `.env.local`로 복사해 값 채우기
3. 실행

```bash
npm install
npm run dev          # http://localhost:3000
```

## 배포 (Vercel)

- 환경 변수 `BACKEND_URL`(백엔드 배포 주소)을 등록합니다.
- `BACKEND_URL`을 바꾸면 다시 배포해야 반영됩니다(빌드할 때 rewrites가 정해짐).

## 지도

- 카카오맵 대신 **MapLibre + OpenFreeMap 오픈 타일**로 큰길·지하철·물·공원만 남긴 단순한 지도를 그립니다 (11/9 결정). API 키가 필요 없습니다.
- 지도 스타일은 `lib/mapStyle.ts`, 지하철 노선·역은 `public/map/*.geojson`(OpenStreetMap에서 추출)에 있습니다.
- 지도 오른쪽 아래 `© OpenStreetMap` 출처 표시는 지우면 안 됩니다.

## 화면

- `/` 지도 홈 (멀리서 보면 구역, 구역을 누르거나 확대하면 장소)
- `/heat/[placeId]` 열기 올리기
- `/me` 내 발자국
- `/dev` API 테스트용 버튼 페이지

## 폴더

```
app/         페이지
components/  지도, 마커, 구역, 코스, 장소 시트, 그래프
lib/         상수, 기기 ID, 거리·시간 유틸, 온도 단계 (백엔드 lib의 복사본 포함)
```

## 규칙

- 작업 브랜치(`feature/…`) → `develop`으로 PR 후 머지. `main`에는 직접 푸시하지 않고, 최종본만 `develop`에서 PR로 머지한다
- `lib/constants.ts`, `lib/temperature.ts`, `lib/geo.ts`, `lib/time.ts`는 백엔드와 같은 내용을 복사해 쓰므로, 백엔드에서 바뀌면 같이 맞추기
