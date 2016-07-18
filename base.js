var Base = {
	//请求新闻列表
	dataConn:function (requestUrl,requestData,type,responseFn,async){
		$.ajax({
	        type: type?type:"get",
	        url: requestUrl,
	        dataType: "json",
	        // contentType: "application/json; charset=utf-8;",
	        data: requestData,
	        jsonp:"callback",
	        timeout: 100000,
	        crossDomain:true,
	        cache: false,
	        async: async===undefined?true:async,
	        success: function(data, textStatus, xhr){
	            if(data){
	            	if (responseFn != undefined && typeof(responseFn) == "function") {
                        responseFn(data, textStatus,xhr);
                    }
	            }
	        },
	        error:function(e) {
	        	return false;
	        }
	    })
	}
}
module.exports = Base;