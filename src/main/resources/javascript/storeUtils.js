var contains = function(needle) {
    // Per spec, the way to identify NaN is that it is not equal to itself
    var findNaN = needle !== needle;
    var indexOf;

    if(!findNaN && typeof Array.prototype.indexOf === 'function') {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function(needle) {
            var i = -1, index = -1;

            for(i = 0; i < this.length; i++) {
                var item = this[i];

                if((findNaN && item !== item) || item === needle) {
                    index = i;
                    break;
                }
            }

            return index;
        };
    }

    return indexOf.call(this, needle) > -1;
};

/**
 * This function get the categories table sorted for the categories filter initialization
 * @param modulesCategories
 * @returns {Array} : String array containing tags strings
 */
function getSortedTags(modulesTags){
    var tags = [];
    $.each(modulesTags, function(moduleId,moduleTags){
        for(var index=0; index<moduleTags.length;index++){
            $("#module-"+moduleId).addClass("tag-"+moduleTags[index].split(" ").join("-"));
            if(!contains.call(tags,moduleTags[index])){
                tags.push(moduleTags[index]);
            }
        }
    });
    //Sort tags list for filter selector
    tags.sort();
    return tags;
}

/**
 * Get top K tags
 *
 * @param tagCountMap
 * @param k
 * @returns {Array}
 */
function getTopKTags(tagCountMap, k) {
    var arr = [];
    for (var i = 0; i < Object.keys(tagCountMap).length; i++) {
        arr[i] = [];
    }

    for (var tag in tagCountMap)
        if (tagCountMap.hasOwnProperty(tag)) {
            var count = tagCountMap[tag];
            arr[count].push(tag);
        }

    var topTen = [];
    for (var i = arr.length - 1; i >= 0; i-- ) {
        if (arr[i].length > 0 && topTen.length < k) {
            var availableRoom = k - topTen.length;
            if (arr[i].length > availableRoom) {
                topTen = topTen.concat(arr[i].splice(0, availableRoom));
            }
            else {
                topTen = topTen.concat(arr[i]);
            }
        }
    }
    return topTen;
}

/**
 * This function get the categories table sorted for the categories filter initialization
 * @param modulesCategories
 * @returns {Array} : String array containing each category under the following format <categoryTitle>--categoryID--<categoryId>
 */
function getSortedCategories(modulesCategories){
    var categories = [];
    $.each(modulesCategories, function(categoryTitle,categoryId){
        if(!contains.call(categories,categoryTitle)){
            categories.push(categoryTitle+"--categoryID--"+categoryId);
        }
    });
    //Sort categories list for filter selector
    categories.sort();
    return categories;
}

function moduleDoAddReview(modulePath, form) {

    $.post(modulePath+".addReview.do", form.serialize(), function(result) {

        if (result['moduleUrl'] != "")
            window.location = result['moduleUrl'];

    }, "json");
}

/**
 * This function make an ajax call to the Jahia API and return the result of this call
 * @param urlContext
 * @param workspace
 * @param locale
 * @param way
 * @param endOfURI
 * @param method
 * @param json
 * @param callback
 * @param errorCallback
 * @returns {*}
 */
function jahiaAPIStandardCall(urlContext, workspace, locale, way, endOfURI, method, json, callback, errorCallback) {
    var callResult;
    var url = urlContext + "/" + API_URL_START + "/" + workspace + "/" + locale + "/" + way + (way=="paths"?"":"/") + endOfURI;
    var httpResult = $.ajax({
        contentType: 'application/json',
        data: json,
        dataType: 'json',
        processData: false,
        type: method,
        url: url,
        success: function (result) {
            result["status"] = httpResult.status;
            //calling the callback
            if (!(callback === undefined)) {
                callback(result, json);
            }
            callResult = result;
        },
        error: function (result) {
            result["status"] = httpResult.status;
            return errorCallback(result, json);

        }
    });

    return callResult;
}

/**
 * @Author : Jahia(rahmed)
 * This function make a JSON Post of ckeditor contained in a Row
 * It also defines the error message div css class for the error callback
 * The div has to be defined following the pattern : <ID>Field
 * @param rowId: the Id of the from which post the form entries
 * @param nodeIdentifier : the endofURI for the Jahia API Standard Call
 * @param locale : the locale for the Jahia API Standard Call
 * @param callback : the callback function for the Jahia API Standard Call
 * @param errorCallback : the error callback function for the Jahia API Standard Call
 */
function saveCkEditorChanges(editor, rowId, nodeIdentifier, locale, callback, errorCallback) {

    //Opening the JSON
    var jsonPropTable = {};
    var jsonTable = {};


    var editorValue = editor.getData().trim();

    jsonPropTable[rowId] = {"value": editorValue};

    jsonTable["properties"] = jsonPropTable;

    //calling ajax POST
    var myJSONText = JSON.stringify(jsonTable);
    currentCssClass = rowId + "Field";

    //Calling the Jahia Restful API to Update the node
    jahiaAPIStandardCall(context, "live", locale, "nodes", nodeIdentifier, "PUT", myJSONText, callback, errorCallback);
}

/**
 * Switch between two divs
 * @param id
 */
function switchDiv(id){
    var div= $("#"+id);
    var textDiv = div.find(".original_text");
    var editableDiv = div.find(".editable_text");
    textDiv.toggleClass( "hide" );
    editableDiv.toggleClass( "hide" );
    var authorURLSubmit = div.find("#authorURLSubmit");
    if(authorURLSubmit.length){
        console.log("IN IF !");
        console.log(authorURLSubmit.width());
        console.log(div.find(".form-control").width());
        div.find(".form-control").attr("style","width:"+authorURLSubmit.width()+"px");
        console.log(div.find(".form-control").width());
    }

    /*
        var authorFormSubmitWidth = $("#authorURLDiv #authorURLSubmit").width();
        console.log($("div#authorURLSubmit").width());
        console.log("Buttons Width : "+authorFormSubmitWidth);
        $("#authorURLDiv .form-control").width(authorFormSubmitWidth);
     */
}
function submitText(id, divToSwitch, textClass, ckeditor){
    if(ckeditor){
        //getting the ckeditors
        var editorId = id + "_editor";
        var editor = CKEDITOR.instances[editorId];
        saveCkEditorChanges(editor, id, nodeId, currentLocale, function(a,b){
            console.log("Saved it ");
            var texttag = $("#"+divToSwitch+" ."+textClass);
            console.log("Text class : "+ textClass);
            texttag.empty();
            texttag.html(editor.getData().trim());
            switchDiv(divToSwitch);
        }, function(a,b){
        });
    }
    else{
        //Opening the JSON
        var jsonPropTable = {};
        var jsonTable = {};
        jsonPropTable[id] = {"value": $('#'+id).val()};

        jsonTable["properties"] = jsonPropTable;

        //calling ajax POST
        var myJSONText = JSON.stringify(jsonTable);
        //Calling the Jahia Restful API to Update the node
        jahiaAPIStandardCall(context, "live", currentLocale, "nodes", nodeId, "PUT", myJSONText, function(a,b){
            switchDiv(divToSwitch);
        }, function(a,b){
            switchDiv(divToSwitch);
        });

    }
}

/*Icon edition function*/
function submitIcon(loadingURL,postURL, nodeId){
    console.log("Icon submitted !");
    $("#icon_upload_"+nodeId).submit();
    //Get form pictures
    var data = new FormData();
    $.each($('#icon_input_'+nodeId)[0].files, function(i, file) {
        data.append('file'+i, file);
    });
    //Add JCR Creation information
    data['jcrNodeType']="jnt:file";
    data['jcrReturnContentType']='json';
    data['jcrReturnContentTypeOverride']='application/json; charset=UTF-8';
    //Remove previews and put loading gif instead
    $("#icon_upload_"+nodeId).empty();
    $("#icon_upload_"+nodeId).append('<img class="pull-center" src="'+loadingURL+'" style="margin-left:45.5%"/>');
    //Send pictures to server for node creation
    $.ajax({
     url: postURL,
        data: data,
        cache: false,
        contentType: false,
        processData: false,
        type: 'POST',
     success: function(data){
         console.log("SUCCESS!");
         var jsonData = $.parseJSON(data);
         window.location.reload();
         //Reset Form
         $('#icon_upload_' + nodeId)[0].reset();
         return false;
     }
    });
    return false;
}