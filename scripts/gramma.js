/**
 *
 * (c) Copyright Ascensio System SIA 2020
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
(function(window, undefined){
	window.oncontextmenu = function(e)
	{
		if (e.preventDefault)
			e.preventDefault();
		if (e.stopPropagation)
			e.stopPropagation();
		return false;
	};

	var isInit = false;
	var CurLang = "auto";
	var sText = "";
	var displayNoneClass = "display-none";
    var elements         = null;
    var serviceUrl = "https://languagetool.org/api/v2/check";
    var sPathRoot = document.location.protocol + "//" + document.location.host + document.location.pathname.replace("index.html", "vendor/grammalecte-sdk/grammalecte");
    var oGramma = null;
    var arrAllWords = null;

	function showLoader(elements, show) {
       switchClass(elements.loader, displayNoneClass, !show);
    };

	function switchClass(el, className, add) {
        if (add) {
            el.classList.add(className);
        } else {
            el.classList.remove(className);
        }
    };

	window.Asc.plugin.init = function(text)	{
		sText = text;
		document.getElementById("textarea").value = text;
		if (!isInit) {
			init();
			isInit = true;
		}
	};
    window.Asc.plugin.onThemeChanged = function(theme)
    {
        window.Asc.plugin.onThemeChangedBase(theme);
        var rule = '.arrow { border-color : ' + window.Asc.plugin.theme["text-normal"] + ';}'
        var styleTheme = document.createElement('style');
        styleTheme.type = 'text/css';
        styleTheme.innerHTML = rule;
        document.getElementsByTagName('head')[0].appendChild(styleTheme);
    };

	$(document).ready(function () {
	    elements = {
            loader: document.getElementById("loader-container"),
            contentHolder: document.getElementById("result"),
		};

        var textarea = document.getElementsByTagName('textarea')[0];
        textarea.addEventListener('keydown', resize);
        function resize() {
            var nBodyHeight = document.querySelector('body').offsetHeight;
            var nTextAreaHeight = document.querySelector('textarea').offsetHeight;

            var el = this;
            setTimeout(function() {
                if (Math.floor(nBodyHeight/nTextAreaHeight) > 2) {
                    el.style.cssText = 'height:100px; width: 100%;';
                    el.style.cssText = 'height:' + (el.scrollHeight + 5) + 'px; width:100%;';
                }
            }, 1);
        };
        
        oGramma = new GrammarChecker(sPathRoot, ["Grammalecte", "Graphspell", "TextFormatter", "Lexicographer", "Tokenizer"], "fr");
		$('#check').on('click', function(){
			sText = document.getElementById("textarea").value.trim();
			if (sText !== "") {
				$("#result").empty();
				var oResult = checkText(sText);
				parseResult(oResult);
				if (window.Asc.plugin.theme)
				    $('.result_div').css('background', window.Asc.plugin.theme["background-normal"]);
				showLoader(elements, false);
			};
		});
		$('#replace').click(function () {
            Asc.scope.arr = ParseText(document.getElementById("textarea").value);
            window.Asc.plugin.info.recalculate = true;

            // for usual paste
            var strResult = "";
            for (var Item = 0; Item < Asc.scope.arr.length; Item++) {
                if (Asc.scope.arr[Item] === "")
                    continue;
                if (Item < Asc.scope.arr.length - 1)
                    strResult += Asc.scope.arr[Item] + '\n';
                else
                    strResult += Asc.scope.arr[Item];
            }

            window.Asc.plugin.executeMethod("GetVersion", [], function(version) {
                if (version === undefined) {
                    window.Asc.plugin.executeMethod("PasteText", [strResult]);
                }
                else {
                    window.Asc.plugin.executeMethod("GetSelectionType", [], function(sType) {
                        switch (sType) {
                            case "none":
                            case "drawing":
                                window.Asc.plugin.executeMethod("PasteText", [strResult]);
                                break;
                            case "text":
                                window.Asc.plugin.callCommand(function() {
                                    Api.ReplaceTextSmart(Asc.scope.arr);
                                });
                                break;
                        }
                    });
                }
            });
        });
	});

    function ParseText(sText) {
        var allParasInSelection = sText.split(/\n/);
        var allParsedParas = [];

        for (var nStr = 0; nStr < allParasInSelection.length; nStr++) {
            if (allParasInSelection[nStr].search(/	/) === 0) {
                allParsedParas.push("");
                allParasInSelection[nStr] = allParasInSelection[nStr].replace(/	/, "");
            }
            var sSplited = allParasInSelection[nStr].split(/	/);

            sSplited.forEach(function(item, i, sSplited) {
                allParsedParas.push(item);
            });
        }

        return allParsedParas;
    };

	function checkText(sText) {
	    updateScroll();
	    showLoader(elements, true);

        var oResult = [];
        arrAllWords = oGramma.oSpellChecker.parseParagraph(sText);
        for (var nWord in arrAllWords)
            oResult.push({
                Word: arrAllWords[nWord].sValue,
                Replacements: oGramma.suggest(arrAllWords[nWord].sValue),
                Index: arrAllWords[nWord].i
            })

        return oResult;
	};

	function parseResult (oResult) {
        if (oResult.length === 0) {
            $('<div>', {
                id: "no_mistakes",
                text: "No possible mistakes found"
            }).appendTo('#result');
        }
        else {
            $('<div>', {
                id: "yes_mistakes",
                text: "Possible mistakes found: " + Object.keys(oResult).length
            }).appendTo('#result');
        }

		oResult.forEach(function(el, ind) {
		    if (el.Replacements.length === 0) {
		        var countMistakes = Number($('#yes_mistakes').text().split(' ')[3]);
			    $('#yes_mistakes').text("Possible mistakes found: " + String(countMistakes - 1));
			    return;
		    }

			$('<div>', {
				id : "div_" + el.Index,
				"class": 'result_div',
				click: function() {
				        var mainElm = this;
                        $(this).find(".details").slideToggle("fast", function() {
                            updateScroll();
                            $(mainElm).find(".separator").toggleClass("display-none");
                        });
                        $(this).find(".arrow").toggleClass("down");
                        $(this).find(".arrow").toggleClass("up");
                    }
			}).appendTo('#result');

            var img_arrow = $('<i>', {
                "class": "arrow down",
            });
            var img_container = $('<div>', {
                "class": "arrow_container"
            });
            var caption_text = $('<span>', {
				"class": 'caption_text',
				text : 'Possible mistake'
			});
            var caption = $('<div>', {
				"class": 'caption',
			});
            var separateLine = $('<div>', {
				"class": 'separator horizontal display-none',
			});

            img_arrow.appendTo(img_container);
            caption_text.appendTo(caption);
            img_container.appendTo(caption);
            caption.appendTo('#div_'+ el.Index);
            separateLine.appendTo('#div_'+ el.Index);

            var div_details = $('<div>', {
				"class": 'details'
			});

			$('<div>', {
				id : "div_replacments_" + el.Index,
				"class": 'replacments',
			}).appendTo(div_details);

			div_details.appendTo('#div_'+ el.Index);

			el.Replacements.forEach(function(elem) {
			    var sClass = '';
			    if (elem === ' ')
			        sClass = ' replacment_space';
				$('<button>', {
					"class": 'replacment btn-text-default' + sClass,
					text: elem,
					click : function () {
						var countMistakes = Number($('#yes_mistakes').text().split(' ')[3]);
			            $('#yes_mistakes').text("Possible mistakes found: " + String(countMistakes - 1));
						correctText($(this));
					}
				}).data({ index : el.Index })
				.appendTo('#div_replacments_' + el.Index);
			});

			var dismiss_buttons = $('<div>', {
			    "class": "dismiss_buttons"
			});

			$('<button>', {
			    text: "Dismiss",
			    click: function () {
					$('#div_'+$(this).data().index).remove();
					var ind = arrAllWords.findIndex(function(el) {
						if (el.i === ind) {
							return true;
						}
					});
					var countMistakes = Number($('#yes_mistakes').text().split(' ')[3]);
					$('#yes_mistakes').text("Possible mistakes found: " + String(countMistakes - 1));
					arrAllWords.splice(ind, 1);
				},
			    "class": "dismiss btn-text-default"
			}).data({ index : el.Index}).appendTo(dismiss_buttons);

			$('<button>', {
			    text: "Dismiss all",
			    click: function () {
					$('.dismiss').each(function() {
					     $(this).trigger("click");
					});
				},
			    "class": "dismiss_all btn-text-default"
			}).appendTo(dismiss_buttons);
			dismiss_buttons.appendTo(div_details);
		});
		updateScroll();
	};

	function correctText(data) {
	    if (data.text()[0] === '(' && data.text()[data.text().length - 1] === ')') {
	        return data.parent().parent().find('.dismiss').trigger("click");
	    }

		var ind = data.data().index;
		ind = arrAllWords.findIndex(function(el) {
			if (el.i === ind) {
				return true;
			}
		});
		var end = arrAllWords[ind].nEnd;
		var temp = sText.slice(0, arrAllWords[ind].nStart) + data.text() + sText.slice(end);
		var count = sText.length - temp.length;
		arrAllWords.splice(ind, 1);
		sText = temp;
		document.getElementById("textarea").value = sText;
		for (var i = ind; i < arrAllWords.length; i++) {
			arrAllWords[i].nStart -= count;
			arrAllWords[i].nEnd -= count;
		}
		$('#div_' + data.data().index).remove();
		if (!arrAllWords.length) {
			$('#check').trigger("click");
		}
		updateScroll();
	};

	function init() {
		var container = document.getElementById('scrollable-container-id');
        Ps = new PerfectScrollbar('#' + container.id, { minScrollbarLength: 20 });
	};
	
	window.Asc.plugin.button = function(id)
	{
		this.executeCommand("close", "");
	};
	
	window.onresize = function() {
		updateScroll();
		updateScroll();
	};

	window.Asc.plugin.onExternalMouseUp = function() {
		var evt = document.createEvent("MouseEvents");
		evt.initMouseEvent("mouseup", true, true, window, 1, 0, 0, 0, 0,
			false, false, false, false, 0, null);

		document.dispatchEvent(evt);
	};
	
	function updateScroll()
	{
		Ps && Ps.update();
	};

	window.Asc.plugin.onTranslate = function()
	{
		var btn = document.getElementById("check");
		if (btn)
			btn.innerHTML = window.Asc.plugin.tr("Check");
	};
		  
})(window, undefined);