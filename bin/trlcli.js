#! /usr/bin/env node 
const program = require('commander')

program.version('0.1.0', '-v, --version', 'output the version')
.usage('<command> [项目名称]')
.command('init', 'init project')

.parse(process.argv)

