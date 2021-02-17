var Ps;
(function(window, undefined){

    var txt                 = "";
    var displayNoneClass    = "display-none";
	var blurClass           = "no_class";
    var elements            = null;
    var translatedParas     = [];
    var iterationCount      = 0;
    var curIter             = 0;
    var select              = null;
    var selectClone         = null;
    var allPairs            = {};

    var serviceUrl       = "https://www.apertium.org/"; //paste your service's url address here

    function showLoader(elements, show) {

       switchClass(elements.contentHolder, blurClass, show);
       switchClass(elements.loader, displayNoneClass, !show);
    };
    function showLoader2(elements, show) {

       switchClass(elements.contentHolder2, blurClass, show);
       switchClass(elements.loader2, displayNoneClass, !show);
    };
	function switchClass(el, className, add) {
        if (add) {
            el.classList.add(className);
        } else {
            el.classList.remove(className);
        }
    };

	window.Asc.plugin.init = function(text)
	{
	    txt = text;
        if (!isReadyToTranslate()) {
            console.log('Languages not loaded!');
            return false;
        }

        if (txt !== '') {
            RunTranslate(txt);
        }
	};

    function PrepareTextToSend(allParas) {
        var result = [];
        var preparedTxt = ""
        for (var nPara = 0; nPara < allParas.length; nPara++) {
            result.push({Index : nPara, Text : allParas[nPara].replace(/ /gi, "+")});
        }
        return result;
    };

    function IsLastTransate(arrParas) {
        if (arrParas.length !== translatedParas.length)
            return false;
        for (var nPara = 0; nPara < arrParas.length; nPara++) {
            if (arrParas[nPara] !== translatedParas[nPara])
                return false;
        }
        return true;
    };
    function GetSourceLang() {
        return document.getElementById("source").value;
    };
    function GetTargetLang() {
        return document.getElementById("target").value;
    };

    //don't work with default service
    function IdentifyLang() {
        $.ajax({
            method: 'GET',
            url: serviceUrl + 'apy/listPairs',
            dataType: 'json'
        }).success(function (oResponse) {
            var maxPredicVal = 0;
            var maxPredict = null;

            for (var predict in oResponse) {
                if (oResponse[predict] > maxPredicVal) {
                    maxPredicVal = oResponse[predict];
                    maxPredict = predict;
                }
            }
        }).error(function(){

        });
    };

    function GetAllLangPairs() {
        $.ajax({
            method: 'GET',
            url: serviceUrl + 'apy/list?',
            dataType: 'json'
        }).success(function (oResponse) {
            var sourceLang = oResponse.responseData[0].sourceLanguage;
            var targetLang = oResponse.responseData[0].targetLanguage;

            allPairs[sourceLang] = [targetLang];

            for (var nPair = 1; nPair < oResponse.responseData.length; nPair++) {
                if (oResponse.responseData[nPair].sourceLanguage === sourceLang) {
                    allPairs[sourceLang].push(oResponse.responseData[nPair].targetLanguage);
                }
                else {
                    sourceLang = oResponse.responseData[nPair].sourceLanguage;
                    targetLang = oResponse.responseData[nPair].targetLanguage;
                    allPairs[sourceLang] = [targetLang];
                }
            }

            AddLangOptions(allPairs);
        }).error(function(){
            showLoader2(elements, false);
        });
    };

    function AddLangOptions(allPairs) {
        var sUrlRequest = 'listLanguageNames?locale=en&languages='
        for (var sLang in allPairs) {
            sUrlRequest += sLang + '+';
        }
        $.ajax({
            method: 'GET',
            url: serviceUrl + 'apy/' + sUrlRequest,
            dataType: 'json'
        }).success(function (oResponse) {
            var sourceLang     = GetSourceLang();

            for (var sLang in oResponse) {
                $("#source").append($("<option>", {
                    value: sLang,
                    text: oResponse[sLang],
                    class: "source"
                    }));
                $("#target").append($("<option>", {
                    value: sLang,
                    text: oResponse[sLang],
                    class: "target"
                    }
                ));
            }
            $("#source option[value=eng]").prop('selected', true);
            select = $('#target');
            selectClone = select.clone();
            updateSelect(allPairs["eng"]);
            showLoader2(elements, false);

            RunTranslate(txt);

            $('.prefs__locale_target').on('change', function() {
                translatedParas = [];
                RunTranslate(txt);
            });
        }).error(function(){
            showLoader2(elements, false);
        });
    };

    function Translate(sourceLanguage, targetLanguage, oText) {
        showLoader(elements, true);
        $.ajax({
            method: 'GET',
            url: serviceUrl + 'apy/translate?markUnknown=no&langpair=' + sourceLanguage + '|' + targetLanguage + '&q=' + oText.Text,
            dataType: 'json'
        }).success(function (oResponse) {
            translatedParas[oText.Index] = oResponse.responseData.translatedText;

            curIter++;
            if (curIter === iterationCount) {
                container = document.getElementById('txt_shower');
                container.innerHTML = "";
                for (var nText = 0; nText < translatedParas.length; nText++) {
                    if (translatedParas[nText] !== "" && translatedParas[nText])
                        container.innerHTML += translatedParas[nText] + '<br>';
                }
                updateScroll();
                updateScroll();
                showLoader(elements, false);
            }
        }).error(function() {
            showLoader(elements, false);
            container = document.getElementById('txt_shower');
            container.innerHTML = "Failed!"
        });
    };

    function DelInvalidChars(arrParas) {
        for (var nPara = 0; nPara < arrParas.length; nPara++) {
            arrParas[nPara] = arrParas[nPara].replace(/#/gi, '');
            arrParas[nPara] = arrParas[nPara].replace(/&/gi, '');
        }
    };

    function SplitText(sText) {
        var allParasInSelection = sText.split(/\n/);
        var allParsedParas = [];

        for (var nStr = 0; nStr < allParasInSelection.length; nStr++) {
            if (allParasInSelection[nStr].search(/	/) === 0) {
                allParsedParas.push("");
                allParasInSelection[nStr] = allParasInSelection[nStr].replace(/	/, "");
            }
            var sSplited = allParasInSelection[nStr].split(/	/);

            sSplited.forEach(function(item, i, sSplited) {
                allParsedParas.push(removeCR(item));
            });
        }

        return allParsedParas;
    };
    function removeCR(text) {
        return text.replace(/\r\n?/g, '');
    };
    function selectText(id) {
        var sel, range;
        var el = document.getElementById(id); //get element id
        if (window.getSelection && document.createRange) { //Browser compatibility
        sel = window.getSelection();
        if (sel.toString() == '') { //no text selection
            window.setTimeout(function(){
                range = document.createRange(); //range object
                range.selectNodeContents(el); //sets Range
                sel.removeAllRanges(); //remove all ranges from selection
                sel.addRange(range);//add Range to a Selection.
                document.execCommand("copy"); //copy
                sel.removeAllRanges(); //remove all ranges from selection
            },1);
        }
        } else if (document.selection) { //older ie
            sel = document.selection.createRange();
            if (sel.text == '') { //no text selection
                range = document.body.createTextRange();//Creates TextRange object
                range.moveToElementText(el);//sets Range
                range.select(); //make selection.
                document.execCommand("copy"); //copy
            }
        }
    }

    function updateSelect(arrTargetLangs) {
        // first, remove all options
        select.find("option").remove();

        var options = [];

        for (var nLang = 0; nLang < arrTargetLangs.length; nLang++) {
            options.push(selectClone.find("option[value=" + arrTargetLangs[nLang] + "]").clone()[0]);
        }

        select.append(options);

        // update select2
        select.trigger('change');
    }

    function isReadyToTranslate() {
        if ($('#source').val() == null)
            return false;
        return true;
    };

    $(document).ready(function () {
        $('.select_example').select2({
			minimumResultsForSearch: Infinity,
			width: "calc(100% - 67px)"
		});
        elements = {
            loader: document.getElementById("loader-container"),
            loader2: document.getElementById("loader-container2"),
            contentHolder: document.getElementById("display"),
            contentHolder2: document.getElementById("main_panel"),
            translator: document.getElementById("translator"),
            select: document.getElementById("select_example"),
		};

        Ps = new PerfectScrollbar("#display", {});

        showLoader2(elements, true);
        GetAllLangPairs();

        setTimeout(function() {
            document.getElementById("copy").onclick = function () {
                if (isReadyToTranslate())
                    selectText("txt_shower");
            }
        }, 500);

        $('.prefs__locale_source').on('change', function() {
            updateSelect(allPairs[GetSourceLang()]);
        });

        setTimeout(function() {
            $('#paste').click(function () {
                if (isReadyToTranslate()) {
                    Asc.scope.arr = translatedParas;
                    window.Asc.plugin.info.recalculate = true;

                    window.Asc.plugin.callCommand(function() {
                        Api.ReplaceTextSmart(Asc.scope.arr);
                    });
                }

                return;
            })
        });
    });

    function RunTranslate(sText) {
        curIter = 0;
        var source_lang = GetSourceLang();
        var allParas = SplitText(sText);
        DelInvalidChars(allParas);
        if (IsLastTransate(allParas))
            return false;

        translatedParas = [];
        document.getElementById('txt_shower').innerHTML = "";

        var target_lang = GetTargetLang();
        var txtToTranslate = PrepareTextToSend(allParas);
        iterationCount = 0;
        for (var nText = 0; nText < txtToTranslate.length; nText++) {
            if (txtToTranslate[nText].Text === "")
                continue;
            iterationCount++;
        }

        for (var nText = 0; nText < txtToTranslate.length; nText++) {
            if (txtToTranslate[nText].Text === "") {
                translatedParas[nText] = "";
                continue;
            }
            Translate(source_lang, target_lang, txtToTranslate[nText]);
        }
    };

    function updateScroll()
	{
		Ps && Ps.update();
	};

	window.Asc.plugin.button = function(id)
	{
		this.executeCommand("close", "");
	};

	window.Asc.plugin.onExternalMouseUp = function()
	{
		var evt = document.createEvent("MouseEvents");
		evt.initMouseEvent("mouseup", true, true, window, 1, 0, 0, 0, 0,
			false, false, false, false, 0, null);

        $('.select_example').select2({
			minimumResultsForSearch: Infinity,
			width: "calc(100% - 67px)"
		});
		document.dispatchEvent(evt);
	};

})(window, undefined);
