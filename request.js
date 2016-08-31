var urls = {
	// 获取新闻列表
	getnews:'http://121.40.34.56/news/baijia/fetchRelate',
	// 获取今日热点
	getHots:'http://120.27.162.110:9001/hot_news',
	// QA互动
	getAnswer:"http://121.40.34.56/news/baijia/fetchQuestion",
	// 生成短连接
	// getShortUrl:"https://api.weibo.com/2/short_url/shorten.json",
	getShortUrl:'https://api-ssl.bitly.com/v3/shorten?access_token=705a1b30ded04337a052f0cbe13c7524d7f2df62&',
	// 关键词
	trigger_keywork:'今日热点',
	hello_newfriends:""
}
module.exports = urls;