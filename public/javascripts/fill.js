$(function(){
	var wordBank = words
		,	rounds = 1
		,	maxRounds
		,	shuff
		, wordIdx = 0
		,	curr
		,	done = false
		,	allFocusFields = [
				"fillForm"
			,	"menu"
			,	"quiz"
			,	"numberRounds"
			,	"numberLabel"
			,	"checkText"
			,	"def"
			,	"correct"
			,	"controlPanel"
			]
		,	noFocus = [
				"beginButton"
			,	"checkButton"
			,	"nextButton"
			,	"endButton"
			]
		,	$s = {
			allFocus: $()
		,	noFocus: $()
		,	stats: $("#stats")
		,	results: $("#results")
		,	footer: $("#footer")
		}
		,	overwriteSubmit;
	
	(function initSelectors(){
		var i
			,	len = allFocusFields.length
			,	field;
		for(i = 0; i < len; ++i){
			field = allFocusFields[i];
			$s[field] = $("#" + field);
			$s.allFocus = $s.allFocus.add($s[field]);
		}
		
		len = noFocus.length;
		for(i = 0; i < len; ++i){
			field = noFocus[i];
			$s[field] = $("#" + field);
			$s.noFocus = $s.noFocus.add($s[field]);
		}
	})();
	
	overwriteSubmit = (function(){
		var flag = true
			,	focus = false;
		
		document.onkeypress = function(e){
			switch(e.charCode){
				case 13:
					if(focus){
						$s.fillForm[0].onsubmit.func();
					}
					break;
			}
		}
		
		$s.allFocus.on("focus", function(){
			focus = true;
		}).on("blur", function(){
			focus = false;
		});
		
		$s.noFocus.on("focus", function(){
			focus = false;
		});
		
		$s.numberLabel = $s.numberLabel.add($s.numberRounds);
		
		return function($form, func){
			var	wrapper = function(){
					if(flag){
						flag = false;
						func(function(){
							setTimeout(function(){
								flag = true;
							}, 20);
						});
					}
				}

			$form[0].onsubmit = function(e){
				e.preventDefault();
				wrapper();
			};
			$form[0].onsubmit.func = wrapper;
		}
	})();
	
	(function init(){
		words = undefined;

		$s.nextButton.on("click", function(){
			next();
		});
		
		$s.endButton.on("click", function(){
			stopQuiz();
		});
		
		$s.numberRounds.on("blur", function(){
			var val = ~~this.value
			if(!val || val < 1){
				this.value = 1;
			}
		});
		
		overwriteBegin(startQuiz);
		overwriteSubmit($s.fillForm, startQuiz);
		
		__render();
	})();

	

	function parseNewLines(str){
		return str.replace(/\r\n|\r|\n/g, "<br />");
	}
	/**
		returns random number between a and b inclusive
		*/
	function rand(a, b){
		var temp;
		a = a || 0;
		b = b || 0;
		if(a > b){
			temp = a;
			a = b;
			b = temp;
		}else if(a === b){
			return a;
		}
		
		b -= a - 1;
		
		return ~~(Math.random() * b) + a;
	}
	
	function shuffle(arr){
		var i
			,	r
			,	temp;
		for(i = arr.length - 1; i > 0; --i){
			r = rand(i);
			temp = arr[i];
			arr[i] = arr[r]
			arr[r] = temp;
		}
		
		return arr;
	}
	
	function initShuffle(len){
		var i
			,	r
			,	arr;
		
		if(!len){
			return [];
		}
		
		arr = [0]
		
		for(i = 1; i < len; ++i){
			r = rand(i);
			arr[i] = arr[r];
			arr[r] = i;
		}
		
		return arr;
	}
	
	function getRandomWord(i){
		return wordBank[shuff[i]];
	}
	
	function getNextWord(){
		var word;
		if(wordIdx >= shuff.length){
			return null;
		}
		word = getRandomWord(wordIdx);
		wordIdx += 1;
		
		return word;
	}
	
	function showWord(word){
		shuffleDefinition(parseNewLines(word.explanation));
		$s.checkText.attr("value", "");
	}
	
	function checkWord(word){
		return $s.checkText.attr("value") === word.word;
	}
	
	function newRound(){
		shuffle(shuff);
		rounds += 1;
		wordIdx = 0;
	}
	
	function startNewRound(callback){
		newRound();
		
		hideMenu();
		hideStats();
		next();
		showQuiz(callback);
	}
	
	function endRound(){
		if(rounds < maxRounds){
			overwriteBegin(startNewRound);
			overwriteSubmit($s.fillForm, startNewRound);
			showEndButton();
			hideNumber();
		}else{
			overwriteBegin(restartQuiz);
			overwriteSubmit($s.fillForm, restartQuiz);
			showNumber();
			hideEndButton();
		}
		showMenu();
		hideQuiz();

		doStatistics();
	}
	
	function stopQuiz(){
		overwriteBegin(restartQuiz);
		overwriteSubmit($s.fillForm, restartQuiz);
		showNumber();
		hideEndButton();
		maxRounds = rounds;
	}
	
	function doStatistics(){
		var learntArr = []
			,	i
			,	len;
		
		for(i = 0, len = wordBank.length; i < len; ++i){
			learntArr.push({
				word: wordBank[i].word
			,	learnt: wordBank[i].learnt
			});
		}
		
		$.ajax({
			type: "POST"
		,	url: "/test/update"
		,	data: { words: learntArr }
		,	statusCode: {
				401: tellToLogIn
			}
		}).fail(function(){
			alert("Unable to post results to the server");
		});
		
		displayStatistics();
	}
	
	function displayStatistics(){
		var i
			,	len
			,	$cell
			,	$row
			,	$res = $s.results
			,	$footer = $s.footer
			,	classer = false;
		
		$res.detach()
			.empty();		
		
		for(i = 0, len = wordBank.length; i < len; ++i, classer = !classer){
			$row = $("<tr>");
			
			if(classer){
				$row.addClass("even");
			}else{
				$row.addClass("odd");
			}

			$cell = $("<td>").text(~~wordBank[i].hits);
			$row.append($cell);

			$cell = $("<td>").text(wordBank[i].learnt);
			$row.append($cell);
			if(~~wordBank[i].learnt >= 20){
				$cell.addClass("learnt");
			}else{
				$cell.addClass("notLearnt");
			}
			
			$cell = $("<td>").text(wordBank[i].word);
			$row.prepend($cell);
			if(wordBank[i].hitThisRound){
				$cell.addClass("learnt");
			}else{
				$cell.addClass("notLearnt");
			}
			
			$row.appendTo($res);
		}
		
		$footer.detach()
			.empty()
			.append($("<td>"))
			.append($("<td>").text("/" + rounds));
		
		$s.stats.append($res).append($footer);

		showStats();
	}
	
	function tellToLogIn(){
		alert("You have to be logged in to change content");
	}
	
	function next(callback){
		if(curr){
			if(!done){
				curr.learnt -= 1;
				curr.hits = curr.hits || 0;
				curr.hitThisRound = false;
			}else{
				done = false;
			}
		}
		curr = getNextWord();
		
		if(curr){
			overwriteSubmit($s.fillForm, check);
			showWord(curr);
			nextAnim();
		}else{
			endRound();
		}		

		callCallBack(callback);
	}
	
	function check(callback){
		overwriteSubmit($s.fillForm, next);
		if(checkWord(curr)){
			curr.learnt = ~~curr.learnt + 1;
			curr.hits = curr.hits + 1 || 1;
			curr.hitThisRound = true;
			succeedAnim();
		}else{
			curr.learnt -= 1;
			curr.hits = curr.hits || 0;
			curr.hitThisRound = false;
			failAnim();
		}
		hideCheckButton()

		done = true;
		
		callCallBack(callback);
	}
	
	function startQuiz(callback){
		maxRounds = ~~$s.numberRounds.attr("value");
		shuff = initShuffle(wordBank.length);
		curr = getNextWord();

		overwriteSubmit($s.fillForm, check);

		showWord(curr);
		
		hideMenu();
		showQuiz();
		
		callCallBack(callback);
	}

	function restartQuiz(callback){
		maxRounds += ~~$s.numberRounds.attr("value");
		
		startNewRound(callback);
	}
	
		function overwriteBegin(func){
		$s.beginButton[0].onclick = function(){
			func();
		}
	}
	
	function callCallBack(arg){
		if(arg && typeof arg === "function"){
			arg();
		}
	}
	
	// animations
	
	function succeedAnim(){
		$s.checkText.addClass("succ");
		disableCheckText();
	}
	
	function failAnim(){
		$s.checkText.addClass("fail");
		disableCheckText();
		showCorrect(curr);
	}
	
	function nextAnim(){
		$s.controlPanel.hide("blind", 175);
		$s.checkText.removeClass("succ fail");
		enableCheckText();
		hideCorrect();
		showCheckButton();
		$s.controlPanel.show("blind", 175);
	}
	
	function disableCheckText(callback){
		$s.checkText.attr("disabled", true);
		
		callCallBack(callback);
	}
	
	function enableCheckText(callback){
		$s.checkText.attr("disabled", false);
		
		callCallBack(callback);
	}
	
	function hideCorrect(callback){
		var cor = $s.correct;
		if(cor.css("display") !== "none"){
			cor.hide("blind", 175, callback);
		}
	}
	
	function showCorrect(word, callback){
		var cor = $s.correct;
		cor.text(word.word);
		cor.show("blind", 175, callback);
	}
	
	function hideCheckButton(callback){
		$s.checkButton.fadeOut(75, callback);
	}
	
	function showCheckButton(callback){
		$s.checkButton.fadeIn(75, callback);
	}
	
	function shuffleDefinition(text, callback){
		$s.def.fadeOut(175, function(){
			$s.def.html(text).fadeIn(175, callback);
		});
	}
	
	function showMenu(callback){
		$s.menu.show("slide", 175, callback);
	}
	
	function hideMenu(callback){
		$s.menu.hide("slide", 175, callback);
	}
	
	function showQuiz(callback){
		$s.quiz.show("blind", 175, callback);
	}
	
	function hideQuiz(callback){
		$s.quiz.hide("blind", 175, callback);
	}
	
	function hideNumber(callback){
		$s.numberLabel.hide("drop", 125, callback);
	}
	
	function showNumber(callback){
		$s.numberLabel.show("drop", 125, callback);
	}
	
	function hideEndButton(callback){
		if($s.endButton.css("display") !== "none"){
			$s.endButton.hide("slide", 125, callback);
		}
	}
	
	function showEndButton(callback){
		if($s.endButton.css("display") === "none"){
			$s.endButton.show("slide", 125, callback);
		}
	}
	
	function showStats(callback){
		if($s.stats.css("display") === "none"){
			$s.stats.show("blind", 1000, callback);
		}
	}
	
	function hideStats(callback){
		if($s.stats.css("display") !== "none"){
			$s.stats.hide("blind", 1000, callback);
		}
	}
});