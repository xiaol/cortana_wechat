// var ipc = require('ipc')
var clipboard = require('electron').clipboard
var NativeImage = require('electron').nativeImage
var _ = require('lodash')
// 应对 微信网页偷换了console 使起失效
// 保住console引用 便于使用
window._console = window.console
var storage = window.localStorage; 
if(!storage){
	_console.log("不支持storage~~~");
}
function debug(/*args*/){
	var args = JSON.stringify(_.toArray(arguments))
	_console.log(args)
}

// 禁止外层网页滚动 影响使用
document.addEventListener('DOMContentLoaded', () => {
	// document.body.style.height = '100%'
	document.body.style.overflow = 'hidden'
})


var free = true
// setTimeout(function(){
	init()
// }, 3000)

function init(){
	var checkForQrcode = setInterval(function(){
		var qrimg = document.querySelector('.qrcode img')
		if (qrimg && qrimg.src.match(/\/qrcode/)) {
			// debug('二维码', qrimg.src)
			clearInterval(checkForQrcode)
		}
	}, 100)
	var checkForLogin = setInterval(function(){
		var chat_item = document.querySelector('.chat_item')
		if (chat_item) {
			onLogin()
			clearInterval(checkForLogin)
		}
	}, 500)
}

function onLogin(){
	// ipc.sendToHost('login')
	$('img[src*=filehelper]').closest('.chat_item')[0].click()
	var checkForReddot = setInterval(function(){
		// window.isFocus = true
		var $reddot = $('.web_wechat_reddot, .web_wechat_reddot_middle').last()
		if ($reddot.length) {
			var $chat_item = $reddot.closest('.chat_item')
			try {
				onReddot($chat_item)
			} catch (err) { // 错误解锁
				reset()
			}
		}
		// var newFriend = $(".chat_item .slide-left .ng-scope")[0];
	}, 100)
}

function onReddot($chat_item){
	if (!free) return
	free = false
	$chat_item[0].click()
	setTimeout(function(){
	var reply = {}
	var usernickname = $(".header .nickname [ng-bind-html='account.NickName']").text();
	// 自动回复 相同的内容
	var $msg = $([
		'.message:not(.me) .bubble_cont > div',
		'.message:not(.me) .bubble_cont > a.app',
		'.message:not(.me) .emoticon',
		'.message_system'
	].join(', ')).last()
	var $message = $msg.closest('.message')
	var $nickname = $message.find('.nickname')
	var $titlename = $('.title_name')
	if ($nickname.length) { // 群聊
		var from = $nickname.text()
		var room = $titlename.text()
	} else { // 单聊
		var from = $titlename.text()
		var room = null
	}
	debug('来自', from, room) // 这里的nickname会被remark覆盖
	if ($msg.is('.message_system')) {
		// var ctn = $msg.find('.content').text()
		// if (ctn === '收到红包，请在手机上查看') {
		// 	text = '发毛红包'
		// } else if (ctn === '位置共享已经结束') {
		// 	text = '位置共享已经结束'
		// } else if (ctn === '实时对讲已经结束') {
		// 	text = '实时对讲已经结束'
		// } else if (ctn.match(/(.+)邀请(.+)加入了群聊/)) {
		// 	text = '加毛人'
		// } else if (ctn.match(/(.+)撤回了一条消息/)) {
		// 	text = '撤你妹'
		// } else {
		// 	// 无视
		// }
	} else if ($msg.is('.emoticon')) { // 自定义表情
		var src = $msg.find('.msg-img').prop('src')
		debug('接收', 'emoticon', src)
		reply.text = ''
	} else if ($msg.is('.picture')) {
		var src = $msg.find('.msg-img').prop('src')
		debug('接收', 'picture', src)
		// reply.text = '发毛图片'
		// reply.image = './fuck.jpeg'
	} else if ($msg.is('.location')) {
		//var src = $msg.find('.img').prop('src')
		var desc = $msg.find('.desc').text()
		debug('接收', 'location', desc)
		reply.text = desc
	} else if ($msg.is('.attach')) {
		var title = $msg.find('.title').text()
		var size = $msg.find('span:first').text()
		var $download = $msg.find('a[download]') // 可触发下载
		debug('接收', 'attach', title, size)
		reply.text = title + '\n' + size
	} else if ($msg.is('.microvideo')) {
		var poster = $msg.find('img').prop('src') // 限制
		var src = $msg.find('video').prop('src') // 限制
		debug('接收', 'microvideo', src)
		reply.text = ''
	} else if ($msg.is('.video')) {
		var poster = $msg.find('.msg-img').prop('src') // 限制
		debug('接收', 'video', src)
		reply.text = ''
	} else if ($msg.is('.voice')) {
		$msg[0].click()
		var duration = parseInt($msg.find('.duration').text())
		var src = $('#jp_audio_1').prop('src') // 认证限制
		var msgid = src.match(/msgid=(\d+)/)[1]
		var date = new Date().toJSON()
			.replace(/\..+/, '')
			.replace(/[\-:]/g, '')
			.replace('T', '-')
		// 20150927-164539_5656119287354277662.mp3
		var filename = `${date}_${msgid}.mp3`
		$('<a>').attr({
			download: filename,
			href: src
		})[0].click() // 触发下载
		debug('接收', 'voice', `${duration}s`, src)
		reply.text = ''
	} else if ($msg.is('.card')) {
		var name = $msg.find('.display_name').text()
		var wxid = $msg.find('.signature').text()
		var img = $msg.find('.img').prop('src') // 认证限制
		debug('接收', 'card', name, wxid)
		reply.text = name + '\n' + wxid
		addFriends();
	} else if ($msg.is('a.app')) {
		var url = $msg.attr('href')
		url = decodeURIComponent(url.match(/requrl=(.+?)&/)[1])
		var title = $msg.find('.title').text()
		var desc = $msg.find('.desc').text()
		var img = $msg.find('.cover').prop('src') // 认证限制
		debug('接收', 'link', title, desc, url)
		reply.text = title +  url
	} else if ($msg.is('.plain')) {
		var text = ''
		var normal = false
		var $text = $msg.find('.js_message_plain')
		// $text.contents().each(function(i, node){
		// 	if (node.nodeType === Node.TEXT_NODE) {
		// 		text += node.nodeValue
		// 	} else if (node.nodeType === Node.ELEMENT_NODE) {
		// 		var $el = $(node)
		// 		if ($el.is('br')) text += '\n'
		// 		else if ($el.is('.qqemoji, .emoji')) {
		// 			text += $el.attr('text').replace(/_web$/, '')
		// 		}
		// 	}
		// })
		text = $text.text();
		_console.log($text.text());
		if (text === '[收到了一个表情，请在手机上查看]' ||
				text === '[Received a sticker. View on phone]') { // 微信表情包
			// text = '发毛表情'
			// return false;
		} else if (text === '[收到一条微信转账消息，请在手机上查看]' ||
				text === '[Received transfer. View on phone.]') {
			// text = '转毛帐'
			// return false;
		} else if (text === '[收到一条视频/语音聊天消息，请在手机上查看]' ||
				text === '[Received video/voice chat message. View on phone.]') {
			// text = '聊jj'
			// return false;
		} else if (text === '我发起了实时对讲') {
			// text = '对讲你妹'
			// return false;
		} else if (text === '该类型暂不支持，请在手机上查看') {
			// text = '啥玩意儿'
			// return false;
		} else if (text.match(/(.+)发起了位置共享，请在手机上查看/) ||
				text.match(/(.+)started a real\-time location session\. View on phone/)) {
			// text = '发毛位置共享'
			// return false;
		}else if(text.indexOf("已通过你的好友验证请求，现在可以开始聊天了")>=0){
			text = "what's going on~"
		} else {
			normal = true
		}
		debug('接收', 'text', text)
		
		// if (normal && !text.match(/叼|屌|diao|丢你|碉堡/i)) text = ''
		reply.text = text
	}else{
		reply.text = "没找到对应类型"
		debug('接收', 'BUG', $msg);
	}
	debug('回复', reply)
	// if(reply.text.indexOf("http://")>0){

	// }
	// 借用clipboard 实现输入文字 更新ng-model=EditAreaCtn
	// ~~直接设#editArea的innerText无效 暂时找不到其他方法~~
	// _console.log("昵称==========="+$nickname.text())
	// _console.log("titlename==========="+$titlename.text())
	// if ($nickname.length) { // 群聊
	// 	if(reply.text.indexOf("@" + usernickname)>=0){
	// 		// paste(reply)
	// 		// requestData(reply.text)
	// 		var toMe_msg = reply.text.replace("@"+usernickname,"")
	// 		_console.log(toMe_msg)
	// 		requestData(toMe_msg,$titlename.text())
	// 	}
	// }else{
	// 	// paste(reply)
	// 	// requestData(reply.text)
	// 	requestData(reply.text,$titlename.text())
	// }

	requestData(reply.text,$titlename.text())
	// 发送text 可以直接更新scope中的变量 @昌爷 提点
	// 但不知为毛 发不了表情
	// if (reply.image) {
	// 	paste(reply)
	// } else {
	// 	angular.element('#editArea').scope().editAreaCtn = reply.text
	// }
	// $('.web_wechat_face')[0].click() 
	// $('[title=阴险]')[0].click() 
	// if (reply.image) {
	// 	setTimeout(function(){
	// 		var tryClickBtn = setInterval(function(){
	// 			var $btn = $('.dialog_ft .btn_primary')
	// 			if ($btn.length) {
	// 				$('.dialog_ft .btn_primary')[0].click()
	// 			} else {
	// 				clearInterval(tryClickBtn)
	// 				reset()
	// 			}
	// 		}, 200)
	// 	}, 100)
	// } else {
	// 	// $('.btn_send')[0].click()
	// 	// reset()
	// }
	}, 100)
}

function reset(){
	// 适当清理历史 缓解dom数量
	var msgs = $('#chatArea').scope().chatContent
	if (msgs.length >= 30) msgs.splice(0, 20)
	$('img[src*=filehelper]').closest('.chat_item')[0].click()
	free = true
}

function paste(opt){
	var oldImage = clipboard.readImage()
	var oldHtml = clipboard.readHtml()
	var oldText = clipboard.readText()
	clipboard.clear() // 必须清空
	if (opt.image) {
		// 不知为啥 linux上 clipboard+nativeimage无效
		try {
			clipboard.writeImage(NativeImage.createFromPath(opt.image))
		} catch (err) {
			opt.image = null
			opt.text = '发不出图片'
		}
	}
	if (opt.html) clipboard.writeHtml(opt.html)
	if (opt.text) clipboard.writeText(opt.text)
	$('#editArea')[0].focus()
	document.execCommand('paste')
	clipboard.writeImage(oldImage)
	clipboard.writeHtml(oldHtml)
	clipboard.writeText(oldText)
}

//添加好友
function addFriends(){
	_console.log("开始自动添加好友。。。。。");
	$(".bubble").filter(".js_message_bubble").filter(".ng-scope").filter(".bubble_default").filter(".left").children(".bubble_cont").children(".card")[0].click();
	$("#mmpop_profile .nickname_area .web_wechat_tab_add").click();
	$("#mmpop_profile .form_area a.button").click();
	setTimeout(function(){
		$(".bubble").filter(".js_message_bubble").filter(".ng-scope").filter(".bubble_default").filter(".left").children(".bubble_cont").children(".card")[0].click();
		$("#mmpop_profile .nickname_area .web_wechat_tab_launch-chat").click();
		var opt ={};
		opt.text = "容我先说句话可好~~";
		paste(opt)
		$('.btn_send')[0].click()
		reset()
	},1000);
}
//request data
function requestData(urlStr,nickname){
	var title = '';
	var url = '';
	var uStr = urlStr;
	var reply = {};
	debug("接收内容",urlStr)
	if(!isNaN(uStr)){
		var lists = JSON.parse(storage.getItem(nickname));
		if(lists&&parseInt(uStr)<=lists.length&&lists.length>0){
			var item = lists[parseInt(uStr)-1];
			uStr = item.title + item.url;
		}else{
			reset();
			return " ";
		}
		debug("数字匹配--",uStr)
	}
	if(nickname==""){
		debug("昵称未找到~",nickname)
		reset();
		return false;
	}
	var urlIndex = 0;
	if(uStr.indexOf("http://")>=0){
		urlIndex = uStr.indexOf("http://");
	}else if(uStr.indexOf("https://")>=0){
		urlIndex = uStr.indexOf("https://");
	}
	debug("uStr",uStr)
	debug("urlIndex",urlIndex)
	if(urlIndex>=0){
		title = uStr.slice(0,urlIndex);
		url = uStr.slice(urlIndex,uStr.length);
		var history = JSON.parse(storage.getItem(nickname+"_send"));
		if(history&&history.length>0){
			reply.html = "";
			for(var h in history){
				// debug(history[h],"新旧标题",title,"结果",history[h].title==title)
				if(history[h].title==title){
					var beginNo = parseInt(history[h].begin),endNo = parseInt(history[h].end);
					var datalist = JSON.parse(storage.getItem(nickname));
					for(var d=beginNo;d<=endNo;d++){
						reply.html += (d + 1) + '.' + ' ' + datalist[d].title +"<br>";
			            reply.html += datalist[d].url + '<br>';
					}
		            paste(reply)
					$('.btn_send')[0].click()
					reset();
					return "";
				}
			}
		}
		dataConn(requestUrl,title,url,nickname);
	}else{
		reply.html = "暂无推荐文章"
		paste(reply)
		reset();
		debug("链接无效",urlIndex)
		return "";
	}
}
function dataConn(requestUrl,title,url,nickname){
	debug("收到title",title,"收到URL",url)
	$.ajax({
        type: 'post',
        url: requestUrl,
        dataType: "json",
        // contentType: "multipart/form-data;",
        data: {'title':title,'url':encodeURIComponent(url)},
        jsonp:"callback",
        timeout: 100000,
        crossDomain:true,
        cache: false,
        async: false,
        statusCode: {
	        404:function(data){
	        	_console.log(data);
	        },
	        503:function(data){
	        	return false;
	        }
	    },
        beforeSend: function(XMLHttpRequest,XMLHttpResponse,text){
           
        },
        success: function(data, textStatus, XMLHttpRequest){
            var reply = {};
            reply.html = '';
            if(!data.msg&&data.length>0){
            	var new_item = [];
            	var new_item_title = JSON.parse(storage.getItem(nickname+"_send"))?JSON.parse(storage.getItem(nickname+"_send")):[]
				var old_item = JSON.parse(storage.getItem(nickname))?JSON.parse(storage.getItem(nickname)):[];
				for(var d in old_item){
		            new_item.push(old_item[d]);
	            }
	            for(var x = 0;x <(data.length/20);x++){
		            var tempArry = [];
	            	//抽出url
	            	var cdt = 20*(x+1)>data.length?data.length:20*(x+1);
		            for(var d = x*20; d<cdt;d ++){
		            	tempArry.push(encodeURIComponent(data[d].url));
		            }
		            //生成短url
		            var short_urls = createShort_url(tempArry);
		            // debug("短连接数组",short_urls,"长度",short_urls.length)
		            //替换长url
		            for(var s in short_urls){
		            	for(var d in data){
		            		if(data[d].url==short_urls[s].long){
		            			data[d].url = short_urls[s].short;
		            			break;
		            		}
		            	}
		            }
	            }
	            //替换完成 发送并保存信息
	            for(var d in data){
		            reply.html += (old_item.length+1+parseInt(d)) + '.' + ' ' + data[d].title +"<br>";
		            reply.html += data[d].url + '<br>';
		            new_item.push(data[d]);
	            }
	            new_item_title.push({"title":title,"begin":old_item.length,"end":(new_item.length-1)});
				storage.setItem(nickname,JSON.stringify(new_item));
				storage.setItem(nickname+"_send", JSON.stringify(new_item_title));
        	}else{
        		reply.html = "暂无推荐文章";
        	}
			paste(reply)
			$('.btn_send')[0].click()
			reset();
        }
    })
}
//替换返回值的url
function replaceMydata(){
	
}

//生成短连接
function createShort_url(urls){
	//urls最大长度20
	var showurls = [];
	var sina_url = 'https://api.weibo.com/2/short_url/shorten.json';
    $.ajax({
        type: 'get',
        url: sina_url+'?access_token=2.004t5RdC0MDVFH6d0cee864fK9S8mB&url_long='+urls.join("&url_long="),
        dataType: "json",
        contentType: "multipart/form-data;",
        jsonp:"callback",
        crossDomain:true,
        cache: false,
        async: false,
        success: function(data, textStatus, XMLHttpRequest){
            for(var d in data.urls){
            	showurls.push({"short":data.urls[d].url_short,"long":data.urls[d].url_long});
            }
        }
    })
    return showurls;
}