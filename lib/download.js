const path = require('path')
const download = require('download-git-repo')
const ora = require('ora')   // 美化插件  下载中提示

module.exports = function (projectName) { // 传递了项目名称
    const tempDownPath = path.resolve(projectName, '.download-temp') // 下载的文件或临时存在 项目名/.download-temp 文件夹中
    return new Promise((resolve, reject) => {
        const spinner = ora('正在下载项目模板。。。')
        spinner.start()

        // 下载模板  repo dis opt callback
        download('https://github.com:tengrenli/vue-tpl#master', tempDownPath, {clone: true}, err => {
            if(err) {
                spinner.fail() // 失败图标展示
                reject(err)
            } else {
                spinner.succeed() //
                resolve(tempDownPath)
            }
        })
    })
}
