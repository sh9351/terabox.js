<h1 align="center">TeraBox.js</h1>
[한국어 README](./README.ko.md)

TeraBox.js is a Node.js module that allows you to easily interact with the Unofficial [TeraBox](https://www.terabox.com) API.

## Features
- Quota management
- List files
- Move, rename, delete files
- Download files
- Stream video files (HLS)

## Getting Started
1. Install TeraBox.js using npm
```sh
npm i terabox.js
```

2. Obtain NDUS cookie from DevTools (If you don't know how, you should probably not be using this!)

3. Run the below example
```js
const fs = require('fs')
const TeraBox = require('terabox.js')

const tb = new TeraBox({
    ndus: `super-secret-value-treat-this-like-your-password-and-never-share-it!` // Grab your NDUS cookie
})

const quota = await tb.quota()
console.log(quota)

const files = await tb.list('/')
console.log(files)
await files[2].move('/path/to/new/location')

// This link requires the NDUS cookie to download
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

// This stream prevents hotlinking
const m3u8 = await tb.stream(file.path, 'M3U8_FLV_264_480')
fs.writeFileSync('/path/to/file.m3u8', m3u8, 'utf-8')
```

## Documentation
Check out the [JSDoc documentation.](https://terabox-js.sh9351.me)

## Developer
[sh9351](https://github.com/sh9351)

## License
This project is licensed under the [MIT License.](./LICENSE)