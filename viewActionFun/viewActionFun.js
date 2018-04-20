/*******viewActionFun******
*封装视图对象，利用相对位置计算，得到组件内部、组件之间的发起的上下左右操作应该得到焦点的下标位置
*依赖条件：
*1、组件容器需要是组件需要设置成实际大小，不应该设置成全屏
*2、组件和组件内部视图单元，用绝对定位，视图单元是指可获得焦点的元素，允许视图单元中包含组件，支持嵌套
*3、组件与组件之间，通过borderObj传递位置与行为信息
*4、视图对象使用方法跟showlist类似，采用包含方式引入即可（意思是不要通过继承得到方法和变量）
**/
function viewActionFun(){
	this.iDebug("--[viewActionFun.js]--version:20180205");
	this.status = 0;//状态 1、初始化完毕
	this.container = null;
	this.className = "";
	this.currPos = 0;
	this.nextPos = -1;//记忆计算出来的下一个焦点位置，可能是一个border对象
	this.memoryArr = [];
	this.memoryItem = null;//下一个路径
	this.actionMap = {};
	this.defaultActionMap = {};//默认行为映射，用于一些特殊的焦点移动
	this.itemMargin = 30;
	this.containerPadding = 30;
	//属性状态就不用了，直接判断长度和属性是否存在就好
}
viewActionFun.prototype = {
	/**
	 * [init 初始化参数]
	 * @param  {[string|dom]} _container [可以是id，或者是dom元素,非jquery对象]
	 * @param  {[string]} _className  [视图单元遍历使用的class]
	 * @param  {[obj]} _obj  [{itemMargin,containerPadding}] 可选 
	 * @return {[boolean]}            [true]
	 */
	init:function(_container,_className,_obj){
		if(typeof _container =="object"){
			this.container = $(_container);
		}else{
			this.container = $("#"+_container);
		}
		this.className = _className;
		if(typeof _obj != "undefined"){
			this.iDebug("--[viewActionFun.js]--init()--_className:"+_className+";JSON.stringify(_obj):"+JSON.stringify(_obj));
			if(_obj.itemMargin){
				this.itemMargin = _obj.itemMargin;
			}
			if(_obj.containerPadding){
				this.containerPadding = _obj.containerPadding;
			}
			if(_obj.defaultActionMap){
				this.defaultActionMap = _obj.defaultActionMap;
				this.actionMap = this.defaultActionMap;
			}
		}else{
			this.iDebug("--[viewActionFun.js]--init()--_className:"+_className);
		}
		return true;
	},
	/**
	 * [refresh 刷新]
	 * @param  {[object]} _obj ：{type,currPos},type:1:清空全部 ，包括actionMap,0 或者undefined 是指更新焦点位置 ;currPos :需要重新定位视图焦点位置，清空memoryArr
	 * @return {[type]}      [description]
	 */
	refresh:function(_obj){
		this.iDebug("--[viewActionFun.js]--refresh()--JSON.stringify(_obj):"+JSON.stringify(_obj));
		if(typeof _obj != "object"){return;}
		if(_obj.type == 1){
			this.clearMemory(1);//清空全部
		}
		if(this.memoryItem != null && this.memoryItem.pos != _obj.currPos){//是否与需要更新的坐标值一样，如果一样，表示外部认同焦点计算，则存到焦点记忆中
			this.memoryArr.push(this.memoryItem);
		}else{//清空路径记忆，因为要更新的焦点位置和计算的不一样了。
			this.clearMemory(0);
		}
		this.memoryItem = null;
		this.currPos = _obj.currPos;
		if(typeof _obj.currPos != "undefined"){
			this.currPos = _obj.currPos;
		}
	},
	/**
	 * [getPosByAction 通过发起的动作，得到下一个坐标]
	 * @param  {[int]} _type [_type:-1|-2|1|2] 分别表示上 左 下 右 
	 * @return {[int or borderObj]}       [得到下标，到达边界的话，得到边界对象]
	 */
	getPosByAction:function(_type){
		this.iDebug("--[viewActionFun.js]--getPosByAction()--_type:"+_type);
		var nextPos = 0;//默认返回0
		var saveFlag = true;
		//是否逆方向，有焦点记忆
		alert(JSON.stringify(this.memoryArr))
		if(this.memoryArr.length>0 && this.memoryArr[this.memoryArr.length-1].type + _type == 0){
			alert("memoryArr")
			nextPos = this.memoryArr.pop().pos;
			saveFlag = false;
		}else if(typeof this.actionMap[this.currPos] != "undefined" && typeof this.actionMap[this.currPos][_type] != "undefined"){//是否有计算过
			alert(JSON.stringify(this.actionMap))
			nextPos = this.actionMap[this.currPos][_type];
		}else{//计算
			alert("getPosByBorderObj")
			var item = this.container.find("."+this.className+":eq("+this.currPos+")");
			var borderObj = {type:_type,position:{left:Math.ceil(item.position().left),top:Math.ceil(item.position().top),width:Math.ceil(item.width()),height:Math.ceil(item.height())},isInside:true};
			nextPos = this.getPosByBorderObj(borderObj);
		}
		if(saveFlag && typeof nextPos != "object" && nextPos != this.currPos){
			this.memoryItem = {type:_type,pos:this.currPos};
		}else{//边界对象
			//this.nextPos.isInside = false;
		}
		this.nextPos = nextPos;
		return nextPos;
	},
	/**
	 * [getPosByBorderObj 通过位置信息，得到下一个坐标位置，或者得到一个边界对象]
	 * @param  {[type]} _borderObj [{type,position,isInside}]  type [-1|-2|1|2] position:[left,top:width,height],isInside:true|false  动作是否内部发起
	 * @return {[type]}            [description]
	 */
	getPosByBorderObj:function(_borderObj){
		this.iDebug("--[viewActionFun.js]--getPosByBorderObj()--JSON.stringify(_borderObj):"+JSON.stringify(_borderObj));
		var itemArr = this.container.find("."+this.className);
		var candidateArr = [];
		var result = this.currPos;//找不到等于0
		if(_borderObj.isInside == false){
			_borderObj = this.translateBorderObj("import",_borderObj);
		}
		switch(_borderObj.type){
			case -1://上
				//先判断是否在边界
				if(_borderObj.position.top<this.containerPadding){
					result = this.translateBorderObj("exit",_borderObj);
					break;
				}
				for(var i = 0;i<itemArr.length;i++){
					if(_borderObj.isInside && this.currPos == i){
						continue;
					}
					var item = itemArr.filter(":eq("+i+")");
					var tempdata = _borderObj.position.top-item.position().top-item.height();
					if(tempdata>0 && tempdata<this.itemMargin){
						//candidateArr.push(i);
						var tempdata1 = item.position().left+item.width() -_borderObj.position.left;
						var tempdata2 = item.position().left -_borderObj.position.left;
						if(tempdata1>=0 && (tempdata1<=_borderObj.position.width || tempdata2<=0)){
							result = i;
							break;
						}
					}
				}   
				break;
			case -2://左
				//先判断是否在边界
				if(_borderObj.position.left<this.containerPadding){
					result = this.translateBorderObj("exit",_borderObj);
					break;
				}
				for(var i = 0;i<itemArr.length;i++){
					if(_borderObj.isInside && this.currPos == i){
						continue;
					}
					var item = itemArr.filter(":eq("+i+")");
					var tempdata = _borderObj.position.left-item.position().left-item.width();
					if(tempdata>0 && tempdata<this.itemMargin){
						//candidateArr.push(i);
						var tempdata1 = item.position().top+item.height() -_borderObj.position.top;
						var tempdata2 = item.position().top-_borderObj.position.top;
						if(tempdata1>=0 && (tempdata1<=_borderObj.position.height || tempdata2<=0)){
							result = i;
							break;
						}
					}
				}   
				break;
			case 1://下
				//先判断是否在边界
				if(this.container.height()-_borderObj.position.top-_borderObj.position.height<this.containerPadding){
					result = this.translateBorderObj("exit",_borderObj);
					break;
				}
				for(var i = 0;i<itemArr.length;i++){
					if(_borderObj.isInside && this.currPos == i){
						continue;
					}
					var item = itemArr.filter(":eq("+i+")");
					var tempdata = item.position().top-_borderObj.position.top-_borderObj.position.height;
					if(tempdata>0 && tempdata<this.itemMargin){
						//candidateArr.push(i);
						var tempdata1 = Math.ceil(item.position().left+item.width() -_borderObj.position.left);
						var tempdata2 = Math.ceil(item.position().left -_borderObj.position.left);
						if(tempdata1>=0 && (tempdata1<=_borderObj.position.width || tempdata2<=0)){
							result = i;
							break;
						}
					}
				}   
				break;
			case 2://右
				//先判断是否在边界
				if(this.container.position().left+this.container.width()-_borderObj.position.left-_borderObj.position.width <this.containerPadding){
					result = this.translateBorderObj("exit",_borderObj);
					break;

				}
				for(var i = 0;i<itemArr.length;i++){
					if(_borderObj.isInside && this.currPos == i){
						continue;
					}
					var item = itemArr.filter(":eq("+i+")");
					var tempdata = item.position().left-_borderObj.position.left-_borderObj.position.width;
					if(tempdata>0 && tempdata<this.itemMargin){
						//candidateArr.push(i);
						var tempdata1 = item.position().top+item.height() -_borderObj.position.top;
						var tempdata2 = item.position().top-_borderObj.position.top;
						if(tempdata1>=0 && (tempdata1<=_borderObj.position.height || tempdata2<=0)){
							result = i;
							break;
						}
					}
				}   
				break;
				break;
			default:
			break;
		}
		if(_borderObj.isInside){
			//内部跳转记忆下 外部的，每次来都计算一下吧
			if(!this.actionMap[""+this.currPos]){
				this.actionMap[""+this.currPos] = {};
			}
			this.actionMap[""+this.currPos][_borderObj.type] = result;   
		}
		this.iDebug("--[viewActionFun.js]--getPosByBorderObj()--JSON.stringify(result):"+JSON.stringify(result));
		return result;                       
	},
	/**
	 *
	 * @param  {[string]} _type      [exit|import表示内部转成外部还是外部转成内部]
	 * @param  {[object]} _borderObj [边界对象]
	 * @return {[object]}            [边界对象]
	 */
	translateBorderObj:function(_type,_borderObj){
		this.iDebug("--[viewActionFun.js]--translateBorderObj:"+_type+";JSON.stringify(_borderObj):"+JSON.stringify(_borderObj))
		if(_type == "exit"){//出口
			switch(_borderObj.type){
				case -1:
					_borderObj.position.top = this.container.position().top;
					_borderObj.position.left = this.container.position().left+_borderObj.position.left;
					break;
				case -2:
					_borderObj.position.left = this.container.position().left;
					_borderObj.position.top = this.container.position().top+_borderObj.position.top;
					break;
				case 1:
					_borderObj.position.top = this.container.position().top;
					_borderObj.position.left = this.container.position().left+_borderObj.position.left;
					_borderObj.position.height = this.container.height();
					break;
				case 2:
					_borderObj.position.left = this.container.position().left;
					_borderObj.position.top = this.container.position().top+_borderObj.position.top;
					_borderObj.position.width = this.container.width();
					break;
				default:
				break;
			}
			_borderObj.isInside = false;
		}else if(_type == "import"){//进口
			switch(_borderObj.type){
				case -1:
					_borderObj.position.top = this.container.position().top+this.container.height();
					_borderObj.position.left = _borderObj.position.left-this.container.position().left;
					if(_borderObj.position.left<0){_borderObj.position.left = 0;}
					_borderObj.position.height = 0;
					break;
				case -2:
					_borderObj.position.left = this.container.position().left+this.container.width();
					_borderObj.position.top = _borderObj.position.top-this.container.position().top;
					if(_borderObj.position.top<0){_borderObj.position.top=0;}
					_borderObj.position.width = 0;
					break;
				case 1:
					_borderObj.position.top = 0;
					_borderObj.position.left = _borderObj.position.left-this.container.position().left;
					if(_borderObj.position.left<0){_borderObj.position.left=0;}
					_borderObj.position.height = 0;
					break;
				case 2:
					_borderObj.position.left = this.container.position().left;
					_borderObj.position.top = _borderObj.position.top-this.container.position().top;
					if(_borderObj.position.top<0){_borderObj.position.top=0;}
					_borderObj.position.width = 0;
					break;
				default:
				break;
			}
			_borderObj.isInside = true;
		}
		_borderObj.position.top = Math.ceil(_borderObj.position.top);
		_borderObj.position.left = Math.ceil(_borderObj.position.left);
		_borderObj.position.width = Math.ceil(_borderObj.position.width);
		_borderObj.position.height = Math.ceil(_borderObj.position.height);
		this.iDebug("--[viewActionFun.js]--translateBorderObj:"+_type+";JSON.stringify(_borderObj):"+JSON.stringify(_borderObj))
		return _borderObj;
	},
	//是否可以执行某个动作 _type[-1|-2|1|2]
	isCanAction:function(_type){
		var result = true;
		var index = this.getPosByAction(_type);
		if(typeof index =="object"){
			result = false;
		}
		this.iDebug("--[viewActionFun.js]--isCanAction()--_type"+_type+";result:"+result);
		return result;
	},
	/**
	 * [clearMemory 清空记忆]
	 * @param  {[int]} _type [_type:1清空全部 0 或者undefinde 清空memoryarr]
	 * @return {[]}
	 */
	clearMemory:function(_type){
		alert("clearMemory")
		if(_type == 1){
			this.actionMap = this.defaultActionMap;
			this.memoryArr = [];
		}else{
			this.memoryArr = [];
		}
	},
	destroy:function(){},
	iDebug:(function(){
		if(typeof window.iDebug == "function"){
			return window.iDebug;
		}
		return function(_str){
			if(navigator.appName.indexOf("iPanel") != -1){
				iPanel.debug(_str);	//假如要看打印的时间，可以改：iPanel.debug(_str, 2);
			}else if(navigator.appName.indexOf("Opera") != -1){
				opera.postError(_str);
			}else if(navigator.appName.indexOf("Netscape") != -1 || navigator.appName.indexOf("Google") != -1){
				console.log(_str);
			}
		}
	})(),
}