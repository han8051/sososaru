# 나의하루

개인용 투두리스트 웹앱 (PWA). 지금은 할 일을 이 기기의 브라우저(localStorage)에 저장합니다.

## 파일 구성
- `index.html` 화면 구조
- `style.css` 디자인
- `app.js` 화면 동작 (하루/검색 탭, 반복, 수정·삭제, 백업·복원)
- `storage.js` 저장 코드 — Supabase로 바꿀 때 이 파일만 교체
- `manifest.webmanifest`, `sw.js`, `icons/` 홈 화면 앱(PWA)용

## GitHub Pages로 배포하기
1. 이 파일들을 저장소(예: `sososaru`)의 맨 위 폴더에 올립니다.
2. 저장소 **Settings → Pages**에서 Source를 **Deploy from a branch**, Branch를 **main / (root)**로 두고 저장합니다.
3. 1~2분 뒤 `https://<아이디>.github.io/sososaru/` 에서 열립니다.
4. 폰에서 그 주소를 열고 **홈 화면에 추가**합니다.

수정 사항을 올린 뒤에는 앱을 한 번 닫았다 열면 새 버전이 반영됩니다.

## 주의
- 브라우저의 사이트 데이터를 지우면 할 일도 사라집니다. 설정(⚙︎) → 백업 내보내기로 가끔 백업하세요.
- 홈 화면 앱과 브라우저는 저장 공간이 따로일 수 있습니다(특히 아이폰). 한쪽으로만 쓰세요.
