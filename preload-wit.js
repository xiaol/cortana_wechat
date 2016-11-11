// var ipc = require('ipc')
var clipboard = require('electron').clipboard
var NativeImage = require('electron').nativeImage
var _ = require('lodash')
var mydata = require("./request")
var base = require("./base")
var wit = require('./aws-rule/examples/basic')
//收到的信息集合
var msg_receive = []
//待发送的信息集合
var msg_send = []
//是否处理收到的信息
var receive_flag = true
//是否处理待发送的信息
var send_flag = true
//是否添加信息
var addMsg_flag = true
//是否可以点击
var click_falg = true
//存储收到的信息
var msg_chats = []
//我的名称
var myname = ""
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



// setTimeout(function(){
	init()
// }, 3000)

function init(){
	var checkForQrcode = setInterval(function(){
		var qrimg = document.querySelector('.qrcode img')
		if (qrimg && qrimg.src.match(/\/qrcode/)) {
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
	myname = $(".panel .header .info .nickname span.display_name").text()
	var checkForReddot = setInterval(function(){
		// window.isFocus = true
		// 产生红点数量
		var $reddot = $('.web_wechat_reddot, .web_wechat_reddot_middle')
		//如果收到信息产生红点 则添加到数组中
		if ($reddot.length>0) {
			if(addMsg_flag){
				addMsg_flag = false
				var l = $reddot.length;
				for(var r=0;r<l;r++){
					var $chat_item = $reddot[r].closest('.chat_item')
					msg_receive.push($chat_item)
					$chat_item.click()
				}
				reset()
				addMsg_flag = true;
			}
		}
	}, 100)
	var send_msg = setInterval(function(){
		//如果收到信息  则解析信息
		if(msg_receive.length>0){
			if(receive_flag){
				receive_flag = false;
				resolve_qst(msg_receive[0])
				msg_receive = msg_receive.slice(1)
			}
		}
		//处理结果集里面的信息
		if(msg_send.length>0){
			if(send_flag){
				send_flag = false;
				resolve_asw(msg_send[0])
				msg_send = msg_send.slice(1)
			}
		}
	}, 400)
}
//解析信息
function resolve_qst($chat_item){
	if(click_falg){
		_console.log("解析信息")
		click_falg = false;
		$chat_item.click()
		setTimeout(function(){
			var msg_content = $([
				'.message.me .bubble_cont > div',
				'.message.me .bubble_cont > a.app',
				'.message.me .emoticon',
				'.message_system:not([ng-if="message.MMTime"])'
			].join(', ')).parents(".ng-scope[ng-repeat='message in chatContent']").first()
			var $msg;
			if(msg_content&&msg_content.length>0){
				$msg = msg_content.nextAll(".ng-scope[ng-repeat]").find([
					'.message.you .bubble_cont > div',
					'.message.you .bubble_cont > a.app',
					'.message.you .emoticon',
					'.message_system:not([ng-if="message.MMTime"])'
				].join(', '))
			}else{
				$msg = $([
					'.message.you .bubble_cont > div',
					'.message.you .bubble_cont > a.app',
					'.message.you .emoticon',
					'.message_system:not([ng-if="message.MMTime"])'
				].join(', '))
			}
			_console.log("信息组",$msg)
			if($msg&&$msg.length>0){
				var ml = $msg.length;
				var msg = {};
				var item_index = -1;
				//遍历聊天记录组数据
				for(var m in msg_chats){
					if($chat_item==msg_chats[m].item){
						item_index = m
					}
				}
				if(item_index==-1){
					var chat_item_msg = {}
					chat_item_msg.item = $chat_item;
					chat_item_msg.msg = [];
					item_index=msg_chats.length;
					msg_chats.push(chat_item_msg);
				}
				for(var m = 0;m<ml;m++){
					var isthere = false;
					msg = msg_analyze($($msg[m]));
					var $nickname = $($msg[m]).find('.nickname')
					for(var c in msg_chats[item_index].msg){
						if(msg.text==msg_chats[item_index].msg[c]){
							isthere = true
						}
					}
					if(!isthere){
						msg_chats[item_index].msg.push(msg.text)
						_console.log("处理信息")
						requestData(msg.text,msg.title,$chat_item,msg.type)
					}else{
						_console.log("信息已经处理~")
					}
				}
			}
			reset();
			receive_flag = true;
		}, 100)
	}else{
		msg_receive.push($chat_item)
		receive_flag = true
	}
}
//分析信息类型  拆分标题链接
function msg_analyze ($massage) {
	var $msg = $massage;
	var $message = $msg.closest('.message')
	var $nickname = $message.find('.nickname')
	var $titlename = $('.title_name')
	var msg_text = {};
	if ($nickname.length) { // 群聊
		msg_text.type = "more";
	} else { // 单聊
		msg_text.type = "one";
	}
	if ($msg.is('.card')) {
		var name = $msg.find('.display_name').text()
		var wxid = $msg.find('.signature').text()
		var img = $msg.find('.img').prop('src') // 认证限制
		debug('接收', 'card', name, wxid)
		addFriends()
		msg_text.text = false
	} else if ($msg.is('a.app')){
		var url = $msg.attr('href')
		url = decodeURIComponent(url.match(/requrl=(.+?)&/)[1])
		var title = $msg.find('.title').text()
		var desc = $msg.find('.desc').text()
		var img = $msg.find('.cover').prop('src') // 认证限制
		debug('接收', 'link', title, desc, url)
		msg_text.text = title + '\n' + url
	} else if ($msg.is('.plain')) {
		var text = ''
		var $text = $msg.find('.js_message_plain')
		text = $text.text()
		msg_text.text = text
		debug('接收', 'text', text)
	}else{
		msg_text.text = '无效的信息类型'
		debug('接收', 'BUG', msg_text);
	}
	msg_text.title = $titlename.text()
	return msg_text
}

//处理结果集   发送数据
function resolve_asw(data_item){
	if(click_falg){
		click_falg = false;
		data_item.item.click();
		setTimeout(function(){
			_console.log("发送信息")
			for(var c in msg_chats){
				if(msg_chats[c].item==data_item.item){
					msg_chats[c].msg = []
				}
			}
			var opt = {};
			opt.html = data_item.text;
			paste(opt);
			$('.btn_send')[0].click();
			reset();
			send_flag = true;
		},100)
	}else{
		msg_send.push(data_item)
		send_flag = true
	}
}

function reset(){
	// 适当清理历史 缓解dom数量
	var msgs = $('#chatArea').scope().chatContent
	if (msgs.length >= 30) msgs.splice(0, 20)
	$('img[src*=filehelper]').closest('.chat_item')[0].click()
	click_falg = true;
}

function paste(opt){
	var oldImage = clipboard.readImage()
	var oldHtml = clipboard.readHtml()
	var oldText = clipboard.readText()
	clipboard.clear() // 必须清空
	if (opt.html) clipboard.writeHtml(opt.html)
	if (opt.text) clipboard.writeText(opt.text)
	$('#editArea')[0].focus()
	document.execCommand('paste')
	clipboard.writeImage(oldImage)
	clipboard.writeHtml(oldHtml)
	clipboard.writeText(oldText)
}
//request data
function requestData(urlStr,nickname,chat_item,chatType){
	var requestUrl = mydata.getnews;
	var title = '';
	var url = '';
	var uStr = urlStr;
	var reply = {};
	var msg_send_item = {};
	msg_send_item.item = chat_item;
	// return process.argv[2];
	if(uStr.indexOf("@"+myname)>=0){
		uStr = uStr.replace("@"+myname,"")
		msg_send.push({"text": wit("wenti"),"item":chat_item});
	}
}
