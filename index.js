var BrowserWindow = require('electron').BrowserWindow
var app = require('electron').app
// var ipc = require('ipc')
var _ = require('lodash')
var fs = require('fs-extra')
var bytes = require('bytes')

function debug(/*args*/){
	var args = JSON.stringify(_.toArray(arguments))
	// console.log(args)
}


var downloadDir = `${__dirname}/download`
fs.mkdirpSync(downloadDir)
app.on('ready', function(){

	// var win = new BrowserWindow({})
	// win.loadUrl('file://' + __dirname + '/index.html')__dirname + '/preload.js'
	var win = new BrowserWindow({
		width:1000,
		height:600,
		resizable: true,
		movable:true,
		center: true,
		show: true,
		frame: true,
		autoHideMenuBar: true,
		titleBarStyle: 'hidden-inset',
		webPreferences: {
			javascript: true,
			plugins: true,
			nodeIntegration: false,
			webSecurity: false,
			preload: __dirname + '/preload-0.0.6.js'
		}
	});
	var urlStr = 'http://wx.qq.com/?lang=zh_CN&t=' + Date.now();
	// var options = {"httpReferrer":urlStr,"extraHeaders":"pragma: no-cache\nAccept:application/json, text/plain, */*\nContent-Type:application/json;charset=UTF-8", "userAgent":'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'}
	win.loadURL(urlStr)
	win.webContents.openDevTools()
	// electron api DownloadItem
	// https://github.com/atom/electron/blob/master/docs/api/download-item.md
	win.webContents.session.on('will-download', function(e, item){
		//e.preventDefault()
		var url = item.url
		var mime = item.mimeType
		var filename = item.filename
		var total = item.getTotalBytes()
		debug('开始下载', filename, mime, bytes(total), url)
		item.setSavePath(`${downloadDir}/${filename}`)
		item.on('updated', function() {
	    // debug('下载中', filename, item.getReceivedBytes())
		})
		item.on('done', function(e, state){
			if (state == 'completed') {
				debug('下载完成', filename)
			} else {
				debug('下载失败', filename)
			}
		})
	})

})

