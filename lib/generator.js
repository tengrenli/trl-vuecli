#! /usr/bin/env node
const path = require('path')
const fs = require('fs')
const Metalsmith = require('metalsmith')
const handlebar = require('handlebars')
const minimatch = require('minimatch')
const rm = require('rimraf').sync  // 用于删除文件
handlebar.registerHelper("equal",function(v1,v2){
    return v1 == v2
});
module.exports = function (metadata = {}, tempDownPath, dest = '.') {
    /**
     * param {
     *  metadata 用户回答的问题 key value
     *  tempDownPath 模板临时存放路径
     *  dest 真正要存放的路径
     * }
     */
    if (!tempDownPath) {
        return Promise.reject(new Error(`无效的source: ${src}`))
    }

    return new Promise((resolve, reject) => {
        const metalsmith = Metalsmith(process.cwd())
            .metadata(metadata) // 用户问题数据
            .clean(false)
            .source(tempDownPath) // 临时模板下载目录
            .destination(dest); // 放到的位置
        const ignoreFile = path.join(tempDownPath, 'templates.ignore')
        if (fs.existsSync(ignoreFile)) {
            // 定义一个用于移除模板中被忽略文件的metalsmith插件
            metalsmith.use((files, metalsmith, done) => {
                const meta = metalsmith.metadata()
                // 先对ignore文件进行渲染，然后按行切割ignore文件的内容，拿到被忽略清单
                const ignores = handlebar.compile(fs.readFileSync(ignoreFile).toString())(meta)
                    .split('\n').filter(item => !!item.length)
                Object.keys(files).forEach(fileName => {
                    // 移除被忽略的文件
                    console.log('ignores:::', ignores)
                    ignores.forEach(ignorePattern => {
                        if (minimatch(fileName, ignorePattern)) {
                            delete files[fileName]
                        }
                    })
                })
                done()
            })
        }
        metalsmith.use((files, metalsmith, done) => {
            /**
             * files = {文件名：contents: <Buffer>, mode: '0644',stats: Stats {dev: '', mode: '', nolink: ....}}
             * */
            const meta = metalsmith.metadata()
            Object.keys(files).forEach(fileName => {
                try {
                    const content = files[fileName].contents.toString() // 转化
                    if (!(fileName.includes('favicon.ico') || fileName.includes('.otf') || fileName.includes('.png'))) {
                        files[fileName].contents = Buffer.from(handlebar.compile(content)(meta)) // 模板编译后 重置buffer 流
                    }
                } catch (e) {
                    console.log('fileName', fileName)
                }
            })
            console.log(`初始化完成！`)
            done()
        })
            .build(err => {
                rm(tempDownPath) // 删除临时目录
                err ? reject(err) : resolve()
            })

    })
}
