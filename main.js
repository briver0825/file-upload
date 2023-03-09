const Koa = require('koa')
const static = require('koa-static')
const { koaBody } = require('koa-body');
const Router = require('koa-router')

const path = require('path')
const fs = require('fs-extra')

const app = new Koa()
const router = new Router()

app.use(static('./public'))
app.use(koaBody({
  multipart: true,
  formidable: {
    uploadDir: path.join(__dirname, 'temp'),
    keepExtensions: true,
  }
}))

const uploadDir = path.join(__dirname, `public/uploads`)

router.post('/upload', context => {
  const { slice } = context.request.body
  const fileName = context.request.files.file.newFilename

  // 不是切片上传，直接移动地址
  if(!Boolean(slice)) {
    const uploadPath = path.join(uploadDir, `${fileName}`)
    fs.moveSync(context.request.files.file.filepath, uploadPath)
  } else {
    // 切片上传
    const { md5, file_name, extension } = context.request.body
    const dirName = path.join(uploadDir, md5)
    const uploadPath = path.join(dirName, file_name)
    const dirExists =  fs.existsSync(dirName)

    // 判断文件是否存在，如果存在秒传
    const fileExists = fs.existsSync(`${dirName}.${extension}`)
    if(fileExists){
      fs.rmSync(context.request.files.file.filepath)
      return context.body = {
        message: '秒传成功😊'
      }
    }

    if(!dirExists) fs.mkdirSync(dirName)

    fs.moveSync(context.request.files.file.filepath, uploadPath)
  }
  
  context.body = `${context.origin}/uploads/${fileName}`
})

router.post('/merge', context => {
  const { md5, file_name } = context.request.body
  const targetDir = path.join(uploadDir, md5)
  const isExists = fs.existsSync(targetDir)

  if(!isExists) {
    context.status = 404
    context.body = {
      message: `不存在该文件`
    }
    return 
  }

  const files = fs.readdirSync(targetDir).sort((a,b) => a - b)
  const fileExtension = path.extname(file_name)
  const targetFile = `${targetDir}${fileExtension}`

  for (const file of files) {
    const data = fs.readFileSync(path.join(targetDir, file))
    fs.appendFileSync(targetFile, data)
  }

  // 成功之后删除不要的文件夹
  fs.remove(targetDir)

  context.body = {
    url: `${context.origin}/uploads/${md5 + fileExtension}`
  }
})

app.use(router.routes())
app.use(router.allowedMethods())

app.listen(3000, () => console.log('listening on port http://localhost:3000'))