(function (){
	var checkpage = setInterval(function(){
		var body = document.getElementsByTagName("body")[0]
		if (body) {
			body.addEventListener("click", getText, false);
			body.addEventListener("mouseover", setSelected, false);
			var eles = document.getElementsByTagName('*');
			clearInterval(checkpage);
		}
	}, 100)
	function getText(e){
		var tagName = e.target.tagName.toLocaleLowerCase(),element = e.target;
		element.style.boxSizing = 'border-box';
		element.style.border = '2px dashed #3e78e2';
		// element.style.width = (element.offsetWidth-4)+'px'
		// element.style.height = (element.offsetHeight-4)+'px'
		// element.style.boxShadow = '';
		e.preventDefault();
		try{
			eval('get_'+tagName+'(element)');
		}catch(e){
			console.log(element.textContent)
		}
	}
	function setSelected(e){
		var trg = e.target,substitute = document.createElement('div');
		e.target.style.boxShadow = "#A7E0A2 0px 0px 1px 3px inset";
		e.target.addEventListener("mouseout",setBackgournd,false);
	}
	function setBackgournd(){
		this.style.boxShadow = "none";
	}
	function get_img(element){
		console.log(element.getAttribute('src'))
	}
})() 