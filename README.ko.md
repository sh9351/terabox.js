<h1 align="center">TeraBox.js</h1>
<p align="center">[English README](./README.md)</p>
TeraBox.js는 [TeraBox](https://www.terabox.com) 비공식 API와 연동할 수 있는 모듈입니다.

## 기능
- 저장 공간 관리
- 파일 목록 조회
- 파일 옮기기, 이름 바꾸기, 삭제하기
- 파일 다운로드
- 영상 파일 스트리밍 (HLS)

## 시작하기
1. npm으로 Terabox.js를 설치하세요
```sh
npm i terabox.js
```

2. 개발자 도구에서 NDUS 쿠키를 가져오세요 (만약 방법을 모르시겠다면, 이 모듈을 사용하시면 안됩니다...)

3. 아래 예시를 실행하세요
```js
const fs = require('fs')
const TeraBox = require('terabox.js')

const tb = new TeraBox({
    ndus: `엄청난-비밀-값이니-비밀번호처럼-취급하고-절대로-공유하지-마세요!` // 개발자 도구에서 NDUS 쿠키를 가져오세요
})

const quota = await tb.quota()
console.log(quota)

const files = await tb.list('/')
console.log(files)
await files[2].move('/path/to/new/location')

// 이 링크로 다운로드 받으려면 NDUS 쿠키가 필요합니다
const link = await files[2].download()
console.log(link)

await tb.move({
    '/path/to/source/file1.txt': '/path/to/destination/file1.txt'
})
await tb.delete([
    '/path/to/file1.txt', '/path/to/file2.txt'
])

const body = fs.readFileSync('/path/to/file.mp4')
const file = await tb.upload('/path/to/file.mp4', body)
console.log(file)

// 이 스트림은 핫링크를 차단합니다
const m3u8 = await tb.stream(file.path, 'M3U8_FLV_264_480')
fs.writeFileSync('/path/to/file.m3u8', m3u8, 'utf-8')
```

## 문서
[JSDoc 문서](https://terabox-js.sh9351.me)를 확인해보세요.

## 개발자
[sh9351](https://github.com/sh9351)

## 라이선스
이 프로젝트는 [MIT 라이선스](./LICENSE)로 배포됩니다.