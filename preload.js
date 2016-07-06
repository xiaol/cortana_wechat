// var ipc = require('ipc')
var clipboard = require('electron').clipboard
var NativeImage = require('electron').nativeImage
var _ = require('lodash')
var mydata = require("./request")
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
		// 产生红点数量
		var $reddot = $('.web_wechat_reddot, .web_wechat_reddot_middle')
		//如果收到信息产生红点 则添加到数组中
		if ($reddot.length>0) {
			if(addMsg_flag){
				addMsg_flag = false
				var l = $reddot.length;
				for(var r=0;r<l;r++){
					_console.log($reddot[r]);
					var $chat_item = $reddot[r].closest('.chat_item')
					msg_receive.push($chat_item);
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
				_console.log("开始发送信息",send_flag)
				send_flag = false;
				resolve_asw(msg_send[0])
				msg_send = msg_send.slice(1)
			}
		}
		// var newFriend = $(".chat_item .slide-left .ng-scope")[0];
	}, 2070)
}
//解析信息
function resolve_qst($chat_item){   
	_console.log("解析信息",click_falg)
	if(click_falg){
		click_falg = false;
		_console.log("禁止点击","解析")
		$chat_item.click()
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
			debug('来自', from) // 这里的nickname会被remark覆盖
			if ($msg.is('.card')) {
				var name = $msg.find('.display_name').text()
				var wxid = $msg.find('.signature').text()
				var img = $msg.find('.img').prop('src') // 认证限制
				debug('接收', 'card', name, wxid)
				reply.text = ""
				addFriends();
			} else if ($msg.is('a.app')) {
				var url = $msg.attr('href')
				url = decodeURIComponent(url.match(/requrl=(.+?)&/)[1])
				var title = $msg.find('.title').text()
				var desc = $msg.find('.desc').text()
				var img = $msg.find('.cover').prop('src') // 认证限制
				debug('接收', 'link', title, desc, url)
				reply.text = title + '\n' + url
			} else if ($msg.is('.plain')) {
				var text = ''
				var $text = $msg.find('.js_message_plain')
				text = $text.text();
				//判断消息是否是数字或链接
				// if(text.indexOf("http://")>=0||text.indexOf("https://")>=0||!isNaN(text)){
				// 	reply.text = text
				// }else{
				// 	debug('接收','不合格信息(沉默)',text)
				// 	return false
				// }
				reply.text = text
				debug('接收', 'text', text)
			}else{
				debug('接收', 'BUG', $msg);
			}
			requestData(reply.text,$titlename.text(),$chat_item)
			reset();
			receive_flag = true;
		}, 100)
	}else{
		msg_receive.push($chat_item)
		receive_flag = true
	}
	
}
//处理结果集   发送数据
function resolve_asw(data_item){
	_console.log("发送数据",click_falg)
	if(click_falg){
		_console.log("禁止点击","发送")
		click_falg = false;
		data_item.item.click();
		setTimeout(function(){
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
	_console.log("是否可以点击",click_falg)
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

//添加好友
function addFriends(){
	$(".bubble").filter(".js_message_bubble").filter(".ng-scope").filter(".bubble_default").filter(".left").children(".bubble_cont").children(".card")[0].click();
	$("#mmpop_profile .nickname_area .web_wechat_tab_add").click();
	$("#mmpop_profile .form_area a.button").click();
	setTimeout(function(){
		$(".bubble").filter(".js_message_bubble").filter(".ng-scope").filter(".bubble_default").filter(".left").children(".bubble_cont").children(".card")[0].click();
		$("#mmpop_profile .nickname_area .web_wechat_tab_launch-chat").click();
		var opt ={};
		opt.text = " -- ";
		paste(opt)
		$('.btn_send')[0].click()
		reset()
	},100);
}
//request data
function requestData(urlStr,nickname,chat_item){
	var requestUrl = mydata.getnews;
	var title = '';
	var url = '';
	var uStr = urlStr;
	var reply = {};
	if(!isNaN(uStr)){
		var lists = JSON.parse(storage.getItem(nickname));
		if(lists&&parseInt(uStr)<=lists.length&&lists.length>0){
			var item = lists[parseInt(uStr)-1];
			uStr = item.title + item.url;
		}else{
			debug("未找到该数字对应消息",uStr)
			return " ";
		}
	}
	if(nickname==""){
		debug("昵称未找到~",nickname)
		return false;
	}
	var urlIndex = -1;
	if(uStr.indexOf("http://")>=0){
		urlIndex = uStr.indexOf("http://");
	}else if(uStr.indexOf("https://")>=0){
		urlIndex = uStr.indexOf("https://");
	}
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
					var msg_send_item = {};
					msg_send_item.item = chat_item;
					msg_send_item.text = reply.html;
		            msg_send.push(msg_send_item);
					return "";
				}
			}
		}
		dataConn(requestUrl,title,url,nickname,chat_item);
	}else{
		if(uStr==mydata.trigger_keywork){
			debug("获取今日热点",uStr)
			getHots(mydata.getHots,chat_item)
		}else{
			debug("不感兴趣,保持沉默",uStr)
		}
		return "";
	}
}
//请求新闻列表
function dataConn(requestUrl,title,url,nickname,chat_item){
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
        async: true,
        statusCode: {
	        404:function(data){
	        	_console.log(data);
	        }
	    },
        success: function(res_data, textStatus, XMLHttpRequest){
            var reply = {};
            var data = res_data.searchItems;
            var tags = res_data.tags;
            reply.html = '';
            if(tags&&tags.length>0){
            	for(var t in tags){
            		reply.html += tags[t] + " | " 
            	}
				reply.html += "<br>" 
				var tag_l = reply.html.length;
				for(var r =4;r<tag_l*1.5;r++){
					reply.html += "-"
				} 
				reply.html += "<br>" 
            }
            if(data&&data.length>0){
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
		            // debug("data数组",data,"长度",data.length)
		            // debug("临时数组",tempArry,"长度",tempArry.length)
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
		            reply.html += (old_item.length+1+parseInt(d)) + '.' + ' ' + data[d].title;
		            reply.html += data[d].url + '<br>';
		            new_item.push(data[d]);
	            }
	            new_item_title.push({"title":title,"begin":old_item.length,"end":(new_item.length-1)});
				storage.setItem(nickname,JSON.stringify(new_item));
				storage.setItem(nickname+"_send", JSON.stringify(new_item_title));
        	}else{
        		reply.html = "暂无推荐文章";
        	}
			var msg_send_item = {};
			msg_send_item.item = chat_item;
			msg_send_item.text = reply.html;
            msg_send.push(msg_send_item);
        },
        error:function(e) {
        	return false;
        }
    })
}
//请求今日热点
function getHots(requestUrl,chat_item){
	$.ajax({
        type: 'get',
        url: requestUrl,
        dataType: "json",
        // contentType: "multipart/form-data;",
        jsonp:"callback",
        timeout: 100000,
        crossDomain:true,
        cache: false,
        async: true,
        statusCode: {
	        
	    },
        success: function(data, textStatus, XMLHttpRequest){
            var send_msg = {};
            send_msg.html = '';
            if(data.ret_code==1&&data.result.length>0){
            	var results_hot = [];
            	results_hot = data.result;
	            for(var x = 0;x <(results_hot.length/20);x++){
		            var tempArry = [];
	            	//抽出url
	            	var cdt = 20*(x+1)>results_hot.length?results_hot.length:20*(x+1);
		            for(var d = x*20; d<cdt;d ++){
		            	tempArry.push(encodeURIComponent(results_hot[d].url));
		            }
		            // debug("data数组",data,"长度",data.length)
		            // debug("临时数组",tempArry,"长度",tempArry.length)
		            //生成短url
		            var short_urls = createShort_url(tempArry);
		            // debug("短连接数组",short_urls,"长度",short_urls.length)
		            //替换长url
		            for(var s in short_urls){
		            	for(var r in results_hot){
		            		if(results_hot[r].url==short_urls[s].long){
		            			results_hot[r].url = short_urls[s].short;
		            			break;
		            		}
		            	}
		            }
	            }
	            //替换完成 发送并保存信息
	            for(var r in results_hot){
	            	// debug("热点链接",results_hot[r].url)
		            send_msg.html += results_hot[r].title;
		            send_msg.html += results_hot[r].url + '<br>';
	            }
        	}else{
        		send_msg.html = "暂无今日热点";
        	}
			var msg_send_item = {};
			msg_send_item.item = chat_item;
			msg_send_item.text = send_msg.html;
            msg_send.push(msg_send_item);
        },
        error:function(e) {
        	return false;
        }
    })
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