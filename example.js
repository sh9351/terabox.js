const fs = require('fs')
const TeraBox = require('./lib')

const tb = new TeraBox({
    ndus: `super-secret-value-treat-this-like-your-password-and-never-share-it!` // Grab your NDUS cookie
})

const quota = await tb.quota()
console.log(quota)

const files = await tb.list('/')
console.log(files)
await files[2].move('/path/to/new/location')
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

const m3u8 = await tb.stream(file.path, 'M3U8_FLV_264_480')
fs.writeFileSync('/path/to/file.m3u8', m3u8, 'utf-8')