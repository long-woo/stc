import { start } from '@loongwoo/stc'
// const { start } = require('@loongwoo/stc')

const myPlugin = {
  name: 'stc:myPlugin',
  lang: "cs",
  setup(options) {
    console.log(options)
  }
}

start({
  lang: 'cs',
  outDir: './dist',
  url: 'https://petstore3.swagger.io/api/v3/openapi.json',
  plugins: [
    myPlugin
  ]
})