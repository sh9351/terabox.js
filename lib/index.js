const path = require('node:path')

/*
 * TeraBox API Client
 */
class TeraBox {
    #credentials

    /**
     * Creates an instance of TeraBox
     *
     * @constructor
     * @param {object} credentials - The credentials object
     * @param {string} credentials.ndus - NDUS token (from cookie, used for authentication)
     * @param {string} [credentials.lang] - Language code (default: 'en')
     * @param {string} [credentials.appId] - Application ID (from frontend JS, default: '250528')
     * @param {string} [credentials.browserId] - Browser ID
     * @param {string} [credentials.host] - API host (default: 'https://terabox.com')
     * @param {string} [credentials.blockId] - Block ID (from frontend JS, default: '5910a591dd8fc18c32a8f3df4fdc1761')
     * @param {string} [credentials.userAgent] - User agent string
     * @param {string} [credentials.jsToken] - JS token (from frontend JS)
     */
    constructor(credentials) {
        if (!credentials || !credentials.ndus || typeof credentials.ndus !== 'string') {
            throw new Error(`TypeError [ERR_INVALID_ARG_TYPE]: The "credentials.ndus" property must be of type string. Received ${typeof credentials?.ndus}`)
        }

        this.#credentials = {
            ndus: credentials.ndus,
            lang: credentials.lang || 'en',
            appId: credentials.appId || '250528',
            browserId: credentials.browserId,
            host: credentials.host || 'https://terabox.com',
            blockId: credentials.blockId || '5910a591dd8fc18c32a8f3df4fdc1761',
            cookies: `browserid=${credentials.browserId}; lang=${credentials.lang}; ndus=${credentials.ndus}`,
            userAgent: credentials.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"',
            jsToken: credentials.jsToken || '0C911FEECAF128F69DC7400B26711AC301F4B35A0C14C794D9C3E9DB91F8935326E23BAE805D10167B33F36BB255375DE0B23AFCC96C61D1092BB647E7901C2C',
        }
    }

    /**
     * Fetches quota information (used, total, free space)
     *
     * @example ```js
     * await tb.quota()
     * ```
     * @async
     * @returns {object<{used: number, total: number, free: number}>}
     * @throws {Error} - Throws an error if the API call fails
     */
    async quota() {
        const data = await fetch(`${this.#credentials.host}/api/quota?app_id=${this.#credentials.appId}&web=1&channel=dubox&clienttype=0&jsToken=${this.#credentials.jsToken}`, {
            method: 'post',
            headers: {
                'Cookie': this.#credentials.cookies,
                'User-Agent': this.#credentials.userAgent
            },
        }).then(res => res.json())
        if (data.errno === 0) return {
            used: data.used,
            total: data.total,
            free: data.total - data.used
        }
        else throw new Error(`[ERR_API] ${data.errno} ${data.errmsg || ''}`)
    }

    /**
     * Fetches the list of dirents in the specified directory
     *
     * @example ```js
     * await tb.list('/')
     * ```
     * @async
     * @param {string} [directory='/'] 
     * @returns {Promise<Array<TeraBoxDirent>>}
     * @throws {Error} - Throws an error if the API call fails
     */
    async list(directory = '/') {
        const data = await fetch(`${this.#credentials.host}/api/list?app_id=${this.#credentials.appId}&web=1&channel=dubox&clienttype=0&jsToken=${this.#credentials.jsToken}&dir=${directory}`, {
            method: 'post',
            headers: {
                'Cookie': this.#credentials.cookies,
                'User-Agent': this.#credentials.userAgent
            },
        }).then(res => res.json())
        if (data.errno === 0) return data.list.map(i => new TeraBoxDirent(i, this))
        else throw new Error(`[ERR_API] ${data.errno} ${data.errmsg || ''}`)
    }

    /**
     * Uploads a file buffer to the specified path
     * 
     * @example ```js
     * await tb.upload('/path/to/file.txt', fs.readFileSync('/path/to/file.txt'))
     * ```
     * @async
     * @param {string} filePath
     * @param {Buffer} fileBody
     * @returns {Promise<TeraBoxDirent>}
     * @throws {Error} - Throws an error if the API call fails
     */
    async upload(filePath, fileBody) {
        const size = Buffer.byteLength(fileBody)
        let targetPath = path.dirname(filePath)
        if (!targetPath.endsWith('/')) targetPath += '/'

        const data_precreate = await fetch(`${this.#credentials.host}/api/precreate?app_id=${this.#credentials.appId}&web=1&channel=dubox&clienttype=0&jsToken=${this.#credentials.jsToken}`, {
            method: 'post',
            headers: {
                'Cookie': this.#credentials.cookies,
                'User-Agent': this.#credentials.userAgent,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `path=${filePath}&autoinit=1&target_path=${targetPath}&block_list=["${this.#credentials.blockId}"]&size=${size}&file_limit_switch_v34=true&local_mtime=${Math.floor(new Date().getTime() / 1000)}`
        }).then(res => res.json())
        if (data_precreate.errno !== 0) throw new Error(`[ERR_API] ${data_precreate.errno} ${data_precreate.errmsg || ''}`)

        const formData = new FormData()
        formData.append('file', new Blob([fileBody]), path.basename(filePath))
        const data_superfile = await fetch(`https://c-jp.terabox.com/rest/2.0/pcs/superfile2?app_id=${this.#credentials.appId}&web=1&channel=dubox&clienttype=0&web=1&method=upload&path=${filePath}&uploadid=${data_precreate.uploadid}&uploadsign=0&partseq=0`, {
            method: 'post',
            headers: {
                'Cookie': this.#credentials.cookies,
                'Origin': 'https://www.1024terabox.com',
                'User-Agent': this.#credentials.userAgent,
            },
            body: formData
        }).then(res => res.json())
        if (!data_superfile.md5) throw new Error(`[ERR_API] Unable to upload file`)

        const data_create = await fetch(`${this.#credentials.host}/api/create?app_id=${this.#credentials.appId}&web=1&channel=dubox&clienttype=0&jsToken=${this.#credentials.jsToken}&isdir=0&rtype=1`, {
            method: 'post',
            headers: {
                'Cookie': this.#credentials.cookies,
                'User-Agent': this.#credentials.userAgent,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `path=${filePath}&size=${size}&uploadid=${data_precreate.uploadid}&target_path=${targetPath}&block_list=["${data_superfile.md5}"]&local_mtime=${Math.floor(Date.now() / 1000)}`
        }).then(res => res.json())
        if (data_create.errno === 0) return new TeraBoxDirent(data_create, this)
        else throw new Error(`[ERR_API] ${data_create.errno} ${data_create.errmsg || ''}`)
    }

    /**
     * Downloads one or more files
     *
     * @example ```js
     * // Use an instance of TeraBoxDirent
     * const files = await tb.list('/')
     * await tb.download([files[0]])
     * 
     * // Use file IDs directly
     * await tb.download([1234])
     * ```
     * @async
     * @param {Array<TeraBoxDirent|string|number>} fileIds
     * @returns {Promise<Array<{id: number, link: string}>>} - The download link, requires NDUS cookie
     * @throws {Error} - Throws an error if an invalid fileId is provided or the API call fails
     */
    async download(fileIds) {
        if (!Array.isArray(fileIds)) fileIds = [fileIds]
        fileIds = fileIds.map(fileId => {
            if (fileId instanceof TeraBoxDirent) return fileId.id
            else if (typeof fileId === 'number' || typeof fileId === 'string') return Number(fileId)
            else throw new Error(`TypeError [ERR_INVALID_ARG_TYPE]: The "fileIds" argument must be an array of TeraBoxDirent instances or strings/numbers. Received ${typeof fileId}`)
        })

        const sign = await this.#sign()
        const data = await fetch(`${this.#credentials.host}/api/download?app_id=${this.#credentials.appId}&web=1&channel=dubox&clienttype=0&jsToken=${this.#credentials.jsToken}&fidlist=${JSON.stringify(fileIds)}&type=dlink&vip=2&sign=${sign.sign}&timestamp=${sign.timestamp}&need_speed=0`, {
            method: 'post',
            headers: {
                'Cookie': this.#credentials.cookies,
                'User-Agent': this.#credentials.userAgent
            }
        }).then(res => res.json())
        if (data.errno === 0) {
            if (!data.dlink || data.dlink.length < 1) throw new Error(`[ERR_API] Unable to fetch download link`)
            else return data.dlink.map(i => ({
                id: i.fs_id,
                link: i.dlink
            }))
        } else throw new Error(`[ERR_API] ${data.errno} ${data.errmsg || ''}`)
    }

    /**
     * Moves one or more files to their specified paths
     *
     * @async
     * @param {object} files - An object mapping source paths to target paths
     * @example ```js
     * await tb.move({
     *     '/path/to/source/file1.txt': '/path/to/destination/file1.txt',
     *     '/path/to/source/file2.txt': '/path/to/destination/file2.txt'
     * })
     * ```
     * @returns {Promise<boolean>} - Returns true regardless of success or failure
     * @throws {Error} - Throws an error if the API call fails
     */
    async move(files) {
        if (typeof files !== 'object') throw new Error(`TypeError [ERR_INVALID_ARG_TYPE]: The "files" argument must be of type object. Received ${typeof files}`)

        const data = await fetch(`${this.#credentials.host}/api/filemanager?app_id=${this.#credentials.appId}&web=1&channel=dubox&clienttype=0&jsToken=${this.#credentials.jsToken}&async=2&onnest=fail&opera=move`, {
            method: 'post',
            headers: {
                'Cookie': this.#credentials.cookies,
                'User-Agent': this.#credentials.userAgent
            },
            body: `filelist=${JSON.stringify(Object.entries(files).map(([sourcePath, targetPath]) => ({
                path: sourcePath,
                dest: path.dirname(targetPath) === '/' ? '' : path.dirname(targetPath),
                newname: path.basename(targetPath),
            })))}`
        }).then(res => res.json())
        if (data.errno === 0) return true
        else throw new Error(`[ERR_API] ${data.errno} ${data.errmsg || ''}`)
    }

    /**
     * Deletes one or more files or directories
     * @example ```js
     * // Use an instance of TeraBoxDirent
     * const files = await tb.list('/')
     * await tb.delete([files[0]])
     * 
     * // Use file paths directly
     * await tb.delete(['/path/to/file1.txt', '/path/to/file2.txt'])
     * ```
     * @async
     * @param {Array<TeraBoxDirent|string>} files - An array of TeraBoxDirent instances or file paths to delete
     * @returns {Promise<boolean>} - Returns true regardless of success or failure
     * @throws {Error} - Throws an error if an invalid file path is provided or the API call fails
     */
    async delete(files) {
        if (!Array.isArray(files)) files = [files]
        files = files.map(filePath => {
            if (filePath instanceof TeraBoxDirent) return filePath.path
            else if (typeof filePath === 'string') return filePath
            else throw new Error(`TypeError [ERR_INVALID_ARG_TYPE]: The "files" argument must be an array of TeraBoxDirent instances or strings. Received ${typeof filePath}`)
        })

        const data = await fetch(`${this.#credentials.host}/api/filemanager?app_id=${this.#credentials.appId}&web=1&channel=dubox&clienttype=0&jsToken=${this.#credentials.jsToken}&async=2&onnest=fail&opera=delete`, {
            method: 'post',
            headers: {
                'Cookie': this.#credentials.cookies,
                'User-Agent': this.#credentials.userAgent
            },
            body: `filelist=${JSON.stringify(files)}`
        }).then(res => res.json())
        if (data.errno === 0) return true
        else throw new Error(`[ERR_API] ${data.errno} ${data.errmsg || ''}`)
    }

    /**
     * Streams a video file
     * 
     * @example ```js
     * // Use an instance of TeraBoxDirent
     * const files = await tb.list('/')
     * const file = files[0]
     * await file.stream('M3U8_FLV_264_480')
     * 
     * // Use file path directly
     * await tb.stream('/path/to/video.mp4', 'M3U8_FLV_264_480')
     * ```
     * @async
     * @param {TeraBoxDirent|string} filePath 
     * @param {string} [type='M3U8_FLV_264_480'] - Stream quality (default is 'M3U8_FLV_264_480', while 'M3U8_FLV_264_360' is also available)
     * @returns {Promise<string>} - Returns the HLS M3U8 playlist, hotlinking not allowed
     * @throws {Error} - Throws an error if an invalid file path is provided or the API call fails
     */
    async stream(filePath, type = 'M3U8_FLV_264_480') {
        if (typeof filePath !== 'string') throw new Error(`TypeError [ERR_INVALID_ARG_TYPE]: The "filePath" argument must be of type string. Received ${typeof filePath}`)

        const data = await fetch(`${this.#credentials.host}/api/streaming?app_id=${this.#credentials.appId}&clienttype=0&path=${filePath}&type=${type}&vip=0`, {
            method: 'post',
            headers: {
                'Cookie': this.#credentials.cookies,
                'User-Agent': this.#credentials.userAgent
            },
        }).then(res => res.text())
        if (data.startsWith('{')) try {
            const json = JSON.parse(data)
            if (json.errno !== 0) throw new Error(`[ERR_API] ${json.errno} ${json.errmsg || ''}`)
            else return data
        } catch { return data }
        return data
    }

    /**
     * Creates a signature for downloading files
     *
     * @async
     * @returns {Promise<{sign: string, timestamp: number}>} 
     */
    async #sign() {
        const home = await this.#fetchHome()
        const sign = (function (e) {
            var t, i, n, a, r, o, s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
            n = e.length,
                i = 0,
                t = ''
            while (i < n) {
                if (a = 255 & e.charCodeAt(i++),
                    i === n) {
                    t += s.charAt(a >> 2),
                        t += s.charAt((3 & a) << 4),
                        t += '=='
                    break
                }
                if (r = e.charCodeAt(i++),
                    i === n) {
                    t += s.charAt(a >> 2),
                        t += s.charAt((3 & a) << 4 | (240 & r) >> 4),
                        t += s.charAt((15 & r) << 2),
                        t += '='
                    break
                }
                o = e.charCodeAt(i++),
                    t += s.charAt(a >> 2),
                    t += s.charAt((3 & a) << 4 | (240 & r) >> 4),
                    t += s.charAt((15 & r) << 2 | (192 & o) >> 6),
                    t += s.charAt(63 & o)
            }
            return t
        })(new Function('return ' + home.sign2)()(home.sign3, home.sign1))
        return { sign, timestamp: home.timestamp }
    }

    /**
     * Fetches the home information
     *
     * @async
     * @returns {Promise<{sign1: string, sign2: string, sign3: string, timestamp: number}>} 
     */
    async #fetchHome() {
        const data = await fetch(`${this.#credentials.host}/api/home/info?app_id=${this.#credentials.appId}&web=1&channel=dubox&clienttype=0&jsToken=${this.#credentials.jsToken}`, {
            method: 'post',
            headers: {
                'Cookie': this.#credentials.cookies,
                'User-Agent': this.#credentials.userAgent
            },
        }).then(res => res.json())

        if (data.errno === 0) {
            if (!data.data || !data.data.sign1 || !data.data.sign2 || !data.data.sign3 || !data.data.timestamp) throw new Error(`[ERR_API] Unable to fetch home information`)
            return data.data
        } else throw new Error(`[ERR_API] ${data.errno} ${data.errmsg || ''}`)
    }
}

class TeraBoxDirent {
    #client
    #isDirectory
    constructor(data, client) {
        this.id = data.fs_id
        this.size = data.size || 0
        this.name = data.server_filename
        this.path = data.path
        this.parentPath = path.dirname(data.path)
        this.atimeMs = (data.server_atime || data.atime) * 1000
        this.ctimeMs = (data.server_ctime || data.ctime) * 1000
        this.mtimeMs = (data.server_mtime || data.mtime) * 1000
        this.birthtimeMs = (data.server_ctime || data.ctime) * 1000
        this.#client = client
        this.#isDirectory = !!data.isdir
    }
    /**
     * Returns true if this is a file, false if it is a directory
     *
     * @returns {boolean} 
     */
    isFile() {
        return !this.#isDirectory
    }
    /**
     * Returns true if this is a directory, false if it is a file
     *
     * @returns {boolean} 
     */
    isDirectory() {
        return this.#isDirectory
    }
    /**
     * Returns the last access time of the file or directory
     *
     * @readonly
     * @type {Date}
     */
    get atime() {
        return new Date(this.atimeMs)
    }
    /**
     * Returns the creation time of the file or directory
     *
     * @readonly
     * @type {Date}
     */
    get ctime() {
        return new Date(this.ctimeMs)
    }
    /**
     * Returns the modification time of the file or directory
     *
     * @readonly
     * @type {Date}
     */
    get mtime() {
        return new Date(this.mtimeMs)
    }
    /**
     * Returns the birth time of the file or directory
     *
     * @readonly
     * @type {Date}
     */
    get birthtime() {
        return new Date(this.birthtimeMs)
    }
    /**
     * Downloads the file or directory
     *
     * @async
     * @returns {Promise<string>} - The download link, requires NDUS cookie
     */
    async download() {
        return await this.#client.download(this.id)
            .then(d => d[0].link)
    }
    /**
     * Moves the file or directory to a new location
     *
     * @async
     * @param {string} targetPath - The new location for the file or directory
     * @returns {Promise<boolean>}
     */
    async move(targetPath) {
        if (typeof targetPath !== 'string') throw new Error(`TypeError [ERR_INVALID_ARG_TYPE]: The "targetPath" argument must be of type string. Received ${typeof targetPath}`)
        return await this.#client.move({
            [this.path]: targetPath
        })
    }
    /**
     * Deletes the file or directory
     *
     * @async
     * @returns {Promise<boolean>}
     */
    async delete() {
        return await this.#client.delete(this.path)
    }
    /**
     * Streams the file or directory
     *
     * @async
     * @param {string} type - Stream quality (default is 'M3U8_FLV_264_480', while 'M3U8_FLV_264_360' is also available)
     * @returns {Promise<string>} - Returns the HLS M3U8 playlist, hotlinking not allowed
     */
    async stream(type) {
        return await this.#client.stream(this.path, type)
    }
}

module.exports = TeraBox