var urls = {
	// 获取新闻列表
	getnews:'http://121.40.34.56/news/baijia/fetchRelate',
	// 获取今日热点
	getHots:'http://120.27.162.110:9001/hot_news',
	// QA互动
	getAnswer:"http://121.40.34.56/news/baijia/fetchQuestion",
	// 获取自定义答案
	getMyine:"http://192.168.199.198:8383/get/answer",
	// 生成短连接
	// getShortUrl:"https://api.weibo.com/2/short_url/shorten.json",
	getShortUrl:'http://qqurl.com/create/?',
	// 关键词
	trigger_keywork:'今日热点',
	// 获取音乐
	getMusic:"http://baidu.ting.search.catalogSug"
}
module.exports = urls;