#! /usr/bin/env node
const program = require('commander')
const glob = require('glob') //  遍历文件插件
const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const generator = require('../lib/generator')
const download = require('../lib/download') // 通过download-git-repo 插件下载模板 可支持github gitlab  bitbucket  返回promise


program.usage('<project-name>').parse(process.argv)

let projectName = program.args[0] // 获取用户输入的项目名称

if(!projectName) { // 没有输入项目名称， 返回帮助选项
    program.help()
    return
}

const list = glob.sync('*') // 遍历运行环境当前目录 第一层遍历 1、存在文件 判断是否是文件夹 且和用户输入相同  2、不存在 当前目录与用户输入名称相同，
const rootName = path.basename(process.cwd()) // 获取当前文件夹名称

let next = undefined
if (list.length) { // 存在文件或文件夹0
    console.log(list)
    let arr = list.filter(fileName => {
        const filePath = path.resolve(process.cwd(), fileName)
        const isDir = fs.statSync(fileName).isDirectory() // 判断当前文件是文件夹
        return  fileName.includes(projectName) && isDir  // 过滤同名文件夹
    })
    if (arr.length) { // 存在同名文件夹
        console.log(`项目${projectName}已存在`)
        return
    }
    next = Promise.resolve(projectName) // 保存项目名称 构造promise 对象
} else if (rootName === projectName) { // 同名
    next = inquirer.prompt([
        {
            name: 'buildInCurrent',
            message: '当前目录为空，且目录名称和项目名称相同，是否直接在当前目录下创建新项目？',
            type: 'confirm',
            default: true
        }
    ]).then(answer => {
        return Promise.resolve(answer.buildInCurrent ? projectName : '.')  // false 情况需再次创建同名文件夹
    })
} else {
    next = Promise.resolve(projectName)
}

next && go()

function go () {
    next.then(projectName => {
        console.log('接收到了项目名称:::', projectName)
        if (projectName === '.') { // 当前目录与项目同名 选则了false
            fs.mkdirSync(projectName)
        }
        return download(projectName).then(target => { // 此处操作猜测是同步 待验证
            return {
                target, // 返回的临时下载目录
                name: projectName,
                root: rootName
            }
        })
    }).then(context => { // 拿到download-git-repo 返回结果  进行交互操作
        return inquirer.prompt([
            {
                name: 'name',
                when: 'isNotTest',
                type: 'string',
                required: true,
                message: 'Project name',
            },
            {
                name: 'description',
                when: 'isNotTest',
                type: 'string',
                required: false,
                message: 'Project description',
                default: 'A Vue.js project',
            },
            {
                name: 'author',
                when: 'isNotTest',
                type: 'string',
                message: 'Author',
            },
            {
                name: 'vuex',
                when: 'isNotTest',
                type: 'confirm',
                default: true,
                message: 'Install vuex?'
            },
            {
                name: 'platform',
                when: 'isNotTest',
                type: 'list',
                message: 'PC or Mobile run your project ?',
                default: 'mobile',
                choices: [
                    {
                        name: 'Mobile',
                        value: 'mobile',
                        short: 'mobile',
                    },
                    {
                        name: 'PC',
                        value: 'pc',
                        short: 'pc',
                    }
                ]
            },
            {
                name: 'autoInstall',
                when: 'isNotTest',
                type: 'list',
                default: 'yarn',
                message:
                    'Should we run `yarn install` for you after the project has been created?',
                choices: [
                    {
                        name: 'Yes, use Yarn (recommended)',
                        value: 'yarn',
                        short: 'yarn',
                    },
                    {
                        name: 'Yes, use NPM',
                        value: 'npm',
                        short: 'npm',
                    }
                ],
            },
        ]).then(answer => { // 返回用户选择的选项 {name: '项目名称'， author: '作者'}   同步操作  在此可对用户操作做些处理判断
            return {
                ...context,
                metadata: { // 用户回答 通过metadata 对象传递给下一个方法
                    ...answer
                }
            }
        })
    }).then(ctx => { // 数据包含download-git-repo 和用户问答所有数据  在此进行模板转化  文件处理操作
        // console.log('generator:::', ctx)
        // path.parse(ctx.targe)  结果 {root: '/',dir: '/Users/tengrenli/Desktop/code/my_github/trl-vuecli/项目名称',base: '.download-temp',ext: '',name: '.download-temp'}
        generator(ctx.metadata, ctx.target, path.parse(ctx.target).dir)  // 最后操作 数据包含 {target,name, root, metadata: {...answer}}
    }).catch(err => { // 错误捕获
        console.log('catch err:::', err)
    })
}
