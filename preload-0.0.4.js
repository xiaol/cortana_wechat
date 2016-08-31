// var ipc = require('ipc')
var clipboard = require('electron').clipboard
var NativeImage = require('electron').nativeImage
var _ = require('lodash')
var mydata = require("./request")
var base = require("./base")
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
					msg = msg_analyze($($msg[m]))
					var $nickname = $($msg[m]).find('.nickname')
					for(var c in msg_chats[item_index].msg){
						if(msg.text==msg_chats[item_index].msg[c]){
							isthere = true
						}
					}
					if(!isthere){
						msg_chats[item_index].msg.push(msg.text)
						_console.log("处理信息")
						requestData(msg.text,msg.title,$chat_item)
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
		var from = $nickname.text()
		var room = $titlename.text()
	} else { // 单聊
		var from = $titlename.text()
		var room = null
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
	var msg_send_item = {};
	msg_send_item.item = chat_item;
	if(!urlStr){
		return false
	}
	_console.log("判断信息走向~")
	if(uStr.indexOf("@"+myname)>=0){
		var question = uStr.replace("@"+myname,"")
		getAnswer(chat_item,question);
		return "";
	}
	if(!isNaN(uStr)){
		var lists = JSON.parse(storage.getItem(nickname));
		_console.log("lists",lists)
		_console.log("lists.length",lists.length)
		_console.log("parseInt(uStr)",parseInt(uStr))
		if(lists&&parseInt(uStr)<=lists.length&&lists.length>0){
			var item = lists[parseInt(uStr)-1];
			uStr = item.title + item.url;
		}else{
			_console.log("没找到数字对应的信息")
			return false;
		}
	}
	if(nickname==""){
		_console.log("昵称解析失败~")
		return false;
	}
	var urlIndex = -1;
	if(uStr.indexOf("http://")>=0){
		urlIndex = uStr.indexOf("http://");
	}else if(uStr.indexOf("https://")>=0){
		urlIndex = uStr.indexOf("https://");
	}
	if(urlIndex>=0){
		_console.log("标题+链接信息~")
		title = uStr.slice(0,urlIndex);
		url = uStr.slice(urlIndex,uStr.length);
		var history = JSON.parse(storage.getItem(nickname+"_send"));
		if(history&&history.length>0){
			reply.html = "";
			for(var h in history){
				if(history[h].title==title){
					_console.log("信息已经答复过~")
					var beginNo = parseInt(history[h].begin),endNo = parseInt(history[h].end);
					// var datalist = JSON.parse(storage.getItem(nickname));
					// for(var d=beginNo;d<=endNo;d++){
					// 	reply.html += (d + 1) + '.' + ' ' + datalist[d].title +"<br>";
				    //     reply.html += datalist[d].url + '<br>';
					// }
					reply.html = "该信息已答复--"+(beginNo+1)+"到"+(endNo+1)
					
					msg_send_item.text = reply.html;
		            msg_send.push(msg_send_item);
					return "";
				}
			}
		}
		_console.log("新信息  发送请求")
		dataConn(requestUrl,title,url,nickname,chat_item);
	}else{
		if(uStr==mydata.trigger_keywork){
			_console.log("获取今日热点信息")
			getHots(mydata.getHots,chat_item)
		}else{
			_console.log("不感兴趣,保持沉默",uStr)
		}
		return "";
	}
}
//请求新闻列表
function dataConn(requestUrl,title,url,nickname,chat_item){
	var requestData = {};
	requestData.title = title;
	requestData.url = encodeURIComponent(url);
	_console.log("发送请求  等待结果")
	base.dataConn(requestUrl,requestData,"post",function(res_data){
        var reply = {};
        var data = res_data.searchItems;
        var tags = res_data.tags;
        reply.html = '';
        _console.log("处理返回信息")
        if(tags&&tags.length>0){
        	for(var t in tags){
        		reply.html += tags[t] + " | " 
        	}
			reply.html += "<br>" 
			var tag_l = reply.html.length;
			for(var r =4;r<56;r++){
				reply.html += "-"
			}
			reply.html += "<br>"
        }
        if(data&&data.length>0){
        	var new_item = [];
        	var new_item_title = JSON.parse(storage.getItem(nickname+"_send"))?JSON.parse(storage.getItem(nickname+"_send")):[]
			var old_item = JSON.parse(storage.getItem(nickname))?JSON.parse(storage.getItem(nickname)):[];
			//取出原有的信息
			for(var d in old_item){
	            new_item.push(old_item[d]);
            }
            // for(var x = 0;x <(data.length/20);x++){
	           //  var tempArry = [];
            // 	//抽出url
            // 	var cdt = 20*(x+1)>data.length?data.length:20*(x+1);
	           //  for(var d = x*20; d<cdt;d ++){
	           //  	tempArry.push(encodeURIComponent(data[d].url));
	           //  }
	           //  //生成短url
	           //  _console.log("生成短连接")
	           //  var short_urls = createShort_url(tempArry);
	           //  //替换长url
	           //  for(var s in short_urls){
	           //  	for(var d in data){
	           //  		if(data[d].url==short_urls[s].long){
	           //  			data[d].url = short_urls[s].short;
	           //  			break;
	           //  		}
	           //  	}
	           //  }
            // }
            //替换完成 发送并保存信息
            _console.log("替换链接完成")
            for(var d in data){
            	var tem_data = data[d];
	            reply.html += (old_item.length+1+parseInt(d)) + '.' + ' ' + tem_data.title;
	            tem_data.url = createShort_url(tem_data.url);
	            reply.html += tem_data.url + '<br>';
	            new_item.push(tem_data);
            }
            new_item_title.push({"title":title,"begin":old_item.length,"end":(new_item.length-1)});
			storage.setItem(nickname,JSON.stringify(new_item));
			storage.setItem(nickname+"_send", JSON.stringify(new_item_title));
    	}else{
    		reply.html = "暂无推荐文章";
    	}
        _console.log("信息分析完毕,加入发送数组")
		var msg_send_item = {};
		msg_send_item.item = chat_item;
		msg_send_item.text = reply.html;
        msg_send.push(msg_send_item);
	});
}
//请求今日热点
function getHots(requestUrl,chat_item){
	base.dataConn(requestUrl,"","get",
		function(data, textStatus, XMLHttpRequest){
            var send_msg = {};
            send_msg.html = '';
            if(data.ret_code==1&&data.result.length>0){
            	var results_hot = [];
            	results_hot = data.result;
	            // for(var x = 0;x <(results_hot.length/20);x++){
		           //  var tempArry = [];
	            // 	//抽出url
	            // 	var cdt = 20*(x+1)>results_hot.length?results_hot.length:20*(x+1);
		           //  for(var d = x*20; d<cdt;d ++){
		           //  	tempArry.push(encodeURIComponent(results_hot[d].url));
		           //  }
		           //  //生成短url
		           //  var short_urls = createShort_url(tempArry);
		           //  //替换长url
		           //  for(var s in short_urls){
		           //  	for(var r in results_hot){
		           //  		if(results_hot[r].url==short_urls[s].long){
		           //  			results_hot[r].url = short_urls[s].short;
		           //  			break;
		           //  		}
		           //  	}
		           //  }
	            // }
	            //替换完成 发送并保存信息
	            for(var r in results_hot){
	            	var result = results_hot[r];
	            	result.url = createShort_url(result.url)
		            send_msg.html += result.title;
		            send_msg.html += result.url + '<br>';
	            }
        	}else{
        		send_msg.html = "暂无今日热点";
        	}
			var msg_send_item = {};
			msg_send_item.item = chat_item;
			msg_send_item.text = send_msg.html;
            msg_send.push(msg_send_item);
        }
    )
}
//获取问题答案
function getAnswer (chat_item,question) {
	var requestUrl = mydata.getAnswer;
	var requestData = {};
	requestData.question = question;
	base.dataConn(requestUrl,requestData,"get",function(data){
		var msg_send_item = {},answer;
		if(data&&data.answer){
			answer = data.question + "→ → →<br>" + data.answer;
		}else{
			answer = "没找到答案";
		}
		msg_send_item.item = chat_item;
		msg_send_item.text = answer;
        msg_send.push(msg_send_item);
	}); 
}
//生成短连接
function createShort_url(url){
	//urls最大长度20
	var requestUrl = mydata.getShortUrl,showUrl="";
    requestUrl += 'longUrl='+url,
    base.dataConn(requestUrl,"","get",function(data){
    	if(data.status_code==200){
    		showUrl = data.data.url;
    	}else{
    		showUrl = url;
    	}
    },false);
    return showUrl;
}